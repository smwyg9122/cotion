import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppError } from './error.middleware';
import { API_ERRORS } from '@cotion/shared';

export function superadminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'superadmin') {
    throw new AppError(403, API_ERRORS.UNAUTHORIZED, '슈퍼관리자 권한이 필요합니다');
  }
  next();
}
