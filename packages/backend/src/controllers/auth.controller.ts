import { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { userCreateSchema, userLoginSchema, passwordChangeSchema } from '@cotion/shared';

export const authController = {
  signup: asyncHandler(async (req: AuthRequest, res: Response) => {
    // Validate input
    const input = userCreateSchema.parse(req.body);

    // Create user
    const result = await AuthService.signup(input);

    res.status(201).json({
      success: true,
      data: result,
    });
  }),

  login: asyncHandler(async (req: AuthRequest, res: Response) => {
    // Validate input
    const input = userLoginSchema.parse(req.body);

    // Login user
    const result = await AuthService.login(input);

    res.json({
      success: true,
      data: result,
    });
  }),

  logout: asyncHandler(async (req: AuthRequest, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }

    res.clearCookie('refreshToken');

    res.json({
      success: true,
      data: { message: '로그아웃되었습니다' },
    });
  }),

  refresh: asyncHandler(async (req: AuthRequest, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '리프레시 토큰이 필요합니다',
        },
      });
    }

    const accessToken = await AuthService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: { accessToken },
    });
  }),

  me: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다',
        },
      });
    }

    const user = await AuthService.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '사용자를 찾을 수 없습니다',
        },
      });
    }

    res.json({
      success: true,
      data: user,
    });
  }),

  changePassword: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다',
        },
      });
    }

    // Validate input
    const input = passwordChangeSchema.parse(req.body);

    // Change password
    await AuthService.changePassword(req.user.userId, input);

    res.json({
      success: true,
      data: { message: '비밀번호가 변경되었습니다' },
    });
  }),
};
