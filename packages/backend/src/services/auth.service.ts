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

    return {
      user: userWithoutPassword,
      accessToken,
    };
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

    return {
      user: userWithoutPassword,
      accessToken,
    };
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

  static async refreshAccessToken(refreshToken: string): Promise<string> {
    // Verify refresh token
    const payload = JWTService.verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database
    const session = await db('sessions')
      .where({ refresh_token: refreshToken })
      .andWhere('expires_at', '>', db.fn.now())
      .first();

    if (!session) {
      throw new AppError(401, API_ERRORS.UNAUTHORIZED, '유효하지 않은 리프레시 토큰입니다');
    }

    // Generate new access token
    const accessToken = JWTService.generateAccessToken(payload);

    return accessToken;
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
    return userWithoutPassword;
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
