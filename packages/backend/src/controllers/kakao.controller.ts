import { Request, Response, NextFunction } from 'express';
import { KakaoService } from '../services/kakao.service';
import { AppError } from '../middleware/error.middleware';
import { API_ERRORS } from '@cotion/shared';

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
        return res.status(400).json({ success: false, error: { message: '인증 코드가 필요합니다' } });
      }

      // Step 1: 카카오 토큰 교환
      let tokenData;
      try {
        tokenData = await KakaoService.exchangeCode(code);
      } catch (error: any) {
        // AppError면 그대로 전달, 아니면 래핑
        if (error instanceof AppError) throw error;
        console.error('Kakao exchangeCode error:', error);
        throw new AppError(400, API_ERRORS.VALIDATION_ERROR, `카카오 토큰 교환 실패: ${error.message}`);
      }

      // Step 2: 토큰 저장
      try {
        await KakaoService.storeTokens(
          userId,
          tokenData.access_token,
          tokenData.refresh_token,
          tokenData.expires_in,
          tokenData.kakao_user_id
        );
      } catch (error: any) {
        console.error('Kakao storeTokens error:', error);
        throw new AppError(500, API_ERRORS.INTERNAL_ERROR, `토큰 저장 실패: ${error.message}`);
      }

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
