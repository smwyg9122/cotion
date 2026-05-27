import bcrypt from 'bcrypt';
import { db } from '../database/connection';
import { JWTService, JWTPayload } from './jwt.service';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';
import { User, UserCreateInput, UserLoginInput, AuthResponse, PasswordChangeInput } from '@cotion/shared';

const SALT_ROUNDS = 12;

export class AuthService {
  static async signup(input: UserCreateInput): Promise<AuthResponse> {
    // Check if username already exists
    const existingUsername = await db('users').where({ username: input.username }).first();
    if (existingUsername) {
      throw new AppError(409, API_ERRORS.CONFLICT, '이미 사용 중인 아이디입니다');
    }

    // Check if email already exists
    const existingEmail = await db('users').where({ email: input.email }).first();
    if (existingEmail) {
      throw new AppError(409, API_ERRORS.CONFLICT, '이미 사용 중인 이메일입니다');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Create user
    const [user] = await db('users')
      .insert({
        username: input.username,
        email: input.email,
        password_hash: passwordHash,
        name: input.name,
        role: 'member',
        allowed_workspaces: input.workspace ? JSON.stringify([input.workspace]) : JSON.stringify(['아유타']),
      })
      .returning('*');

    // Generate tokens
    const tokenPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = JWTService.generateAccessToken(tokenPayload);
    const refreshToken = JWTService.generateRefreshToken(tokenPayload);

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken);

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;
    userWithoutPassword.allowed_workspaces = user.allowed_workspaces ? JSON.parse(user.allowed_workspaces) : ['아유타'];

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    } as AuthResponse;
  }

  static async login(input: UserLoginInput): Promise<AuthResponse> {
    // Find user by username
    const user = await db('users').where({ username: input.username }).first();
    if (!user) {
      throw new AppError(401, API_ERRORS.UNAUTHORIZED, '아이디 또는 비밀번호가 올바르지 않습니다');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError(401, API_ERRORS.UNAUTHORIZED, '아이디 또는 비밀번호가 올바르지 않습니다');
    }

    // Reject deactivated accounts. is_active is nullable for legacy rows;
    // explicit false blocks login, undefined/null is treated as active.
    if (user.is_active === false) {
      // Audit so admins can spot abuse against deactivated accounts.
      try {
        const { ActivityLogService } = require('./activity-log.service');
        ActivityLogService.security(user.id, 'deactivated_user_attempt', {
          username: input.username,
        });
      } catch {
        // best-effort
      }
      throw new AppError(403, API_ERRORS.FORBIDDEN, '비활성화된 계정입니다. 관리자에게 문의하세요.');
    }

    // Update last login
    await db('users').where({ id: user.id }).update({ last_login_at: db.fn.now() });

    // Generate tokens
    const tokenPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = JWTService.generateAccessToken(tokenPayload);
    const refreshToken = JWTService.generateRefreshToken(tokenPayload);

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken);

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;
    userWithoutPassword.allowed_workspaces = user.allowed_workspaces ? JSON.parse(user.allowed_workspaces) : ['아유타', '제이로텍'];

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    } as AuthResponse;
  }

  static async changePassword(userId: string, input: PasswordChangeInput): Promise<void> {
    // Get user
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new AppError(404, API_ERRORS.NOT_FOUND, '사용자를 찾을 수 없습니다');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(input.currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError(401, API_ERRORS.UNAUTHORIZED, '현재 비밀번호가 올바르지 않습니다');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

    // Update password
    await db('users').where({ id: userId }).update({ password_hash: newPasswordHash });

    // Invalidate all existing sessions except current one
    await db('sessions').where({ user_id: userId }).delete();
  }

  /**
   * Refresh access token AND rotate the refresh token.
   *
   * Behavior:
   *  - Validates the JWT signature + DB row.
   *  - If the refresh token is signature-valid but NOT in DB sessions, we
   *    treat that as a reuse attempt (token was previously rotated out) and
   *    revoke ALL sessions for that user — forcing re-login everywhere.
   *  - On success, deletes the consumed refresh token, issues a new pair,
   *    and stores the new refresh token.
   *
   * Returns: { accessToken, refreshToken } so the caller can set the new
   * refresh cookie. Older callers that ignore refreshToken still work.
   */
  static async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify JWT signature first — invalid signatures get a clean 401
    // without polluting our reuse-detection logic.
    let payload: JWTPayload;
    try {
      payload = JWTService.verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(401, API_ERRORS.UNAUTHORIZED, '유효하지 않은 리프레시 토큰입니다');
    }

    const session = await db('sessions')
      .where({ refresh_token: refreshToken })
      .andWhere('expires_at', '>', db.fn.now())
      .first();

    if (!session) {
      // The token is signature-valid but missing from DB. Either:
      //   (a) It's a reused token from a previous rotation — possibly stolen.
      //   (b) The user's sessions were already revoked elsewhere.
      // Either way, blow away every active session for this user so a thief
      // is locked out the moment the legit user does anything.
      await db('sessions').where({ user_id: payload.userId }).delete();
      throw new AppError(401, API_ERRORS.UNAUTHORIZED, '유효하지 않은 리프레시 토큰입니다');
    }

    // Reject if the user has been deactivated since the token was issued.
    const user = await db('users').where({ id: payload.userId }).select('is_active').first();
    if (!user || user.is_active === false) {
      await db('sessions').where({ user_id: payload.userId }).delete();
      throw new AppError(403, API_ERRORS.FORBIDDEN, '비활성화된 계정입니다');
    }

    // Rotate: invalidate the consumed refresh token, mint a new pair.
    // The verified payload includes `iat`/`exp`/`jti` from the previous JWT;
    // strip them so jsonwebtoken can re-issue with a fresh expiresIn + jti.
    const cleanPayload: JWTPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
    await db('sessions').where({ refresh_token: refreshToken }).delete();
    const newAccessToken = JWTService.generateAccessToken(cleanPayload);
    const newRefreshToken = JWTService.generateRefreshToken(cleanPayload);
    await this.storeRefreshToken(payload.userId, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  static async logout(refreshToken: string): Promise<void> {
    await db('sessions').where({ refresh_token: refreshToken }).delete();
  }

  static async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      return null;
    }

    const { password_hash, ...userWithoutPassword } = user;
    userWithoutPassword.allowed_workspaces = user.allowed_workspaces ? JSON.parse(user.allowed_workspaces) : ['아유타', '제이로텍'];
    return userWithoutPassword;
  }

  static async getAllUsers(workspace?: string) {
    const users = await db('users')
      .select('id', 'username', 'email', 'name', 'title', 'avatar_url', 'role', 'allowed_workspaces')
      .where('role', '!=', 'superadmin')
      .orderBy('name');

    if (!workspace) return users;

    // Filter by allowed_workspaces containing the requested workspace
    return users.filter((u: any) => {
      if (!u.allowed_workspaces) return true;
      try {
        const workspaces = typeof u.allowed_workspaces === 'string'
          ? JSON.parse(u.allowed_workspaces)
          : u.allowed_workspaces;
        return Array.isArray(workspaces) ? workspaces.includes(workspace) : true;
      } catch {
        return true;
      }
    });
  }

  private static async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db('sessions').insert({
      user_id: userId,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    });

    // Clean up expired sessions for this user
    await db('sessions')
      .where({ user_id: userId })
      .andWhere('expires_at', '<', db.fn.now())
      .delete();
  }
}
