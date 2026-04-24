import { Request, Response, NextFunction } from 'express';
import { KakaoService } from '../services/kakao.service';

export const kakaoController = {
  // GET /api/kakao/auth-url - Get Kakao OAuth URL
  getAuthUrl: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const authUrl = KakaoService.getAuthUrl(userId);
      res.json({ success: true, data: { authUrl } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/kakao/callback - Handle OAuth callback
  handleCallback: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ success: false, error: '인증 코드가 필요합니다' });
      }

      const tokenData = await KakaoService.exchangeCode(code);
      await KakaoService.storeTokens(
        userId,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_in,
        tokenData.kakao_user_id
      );

      res.json({ success: true, data: { linked: true } });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/kakao/status - Check link status
  getStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const linked = await KakaoService.isLinked(userId);
      res.json({ success: true, data: { linked } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/kakao/unlink - Unlink Kakao
  unlink: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      await KakaoService.unlink(userId);
      res.json({ success: true, data: { linked: false } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/kakao/test - Send test message
  testMessage: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const sent = await KakaoService.sendMessage(userId, '테스트 알림', '카카오톡 알림이 정상적으로 연동되었습니다!');
      res.json({ success: true, data: { sent } });
    } catch (error) {
      next(error);
    }
  },
};
