import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppError } from './error.middleware';
import { API_ERRORS } from '@cotion/shared';

export function superadminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'superadmin') {
    // 403 Forbidden is the right status here: the request IS authenticated
    // but the user lacks the required role. Pair with FORBIDDEN code, not
    // UNAUTHORIZED (which is the 401 family).
    throw new AppError(403, API_ERRORS.FORBIDDEN, '슈퍼관리자 권한이 필요합니다');
  }
  next();
}
