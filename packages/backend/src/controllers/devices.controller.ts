import { Response } from 'express';
import { PushService } from '../services/push.service';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

const VALID_PLATFORMS = ['android', 'ios', 'web'];

export const devicesController = {
  /** 로그인한 기기의 FCM 토큰 등록/갱신 */
  register: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { token, platform } = req.body;
    if (!token || typeof token !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'token이 필요합니다');
    }
    const plat = VALID_PLATFORMS.includes(platform) ? platform : 'web';
    await PushService.registerToken(req.user!.userId, token, plat);
    res.status(201).json({ success: true, data: { registered: true } });
  }),

  /** 로그아웃 등으로 기기 토큰 해제 */
  unregister: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'token이 필요합니다');
    }
    await PushService.unregisterToken(token);
    res.json({ success: true, data: { unregistered: true } });
  }),
};
