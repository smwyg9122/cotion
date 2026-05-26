import { Request, Response, NextFunction } from 'express';
import { JWTService, JWTPayload } from '../services/jwt.service';
import { AppError } from './error.middleware';
import { API_ERRORS } from '@cotion/shared';
import { db } from '../database/connection';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

/**
 * In-memory cache so we don't issue a SELECT for every authenticated request.
 * Maps userId → { isActive, expiresAt(ms) }. TTL keeps deactivations
 * propagating within `ACTIVE_CACHE_TTL_MS`.
 */
const activeCache = new Map<string, { isActive: boolean; expiresAt: number }>();
const ACTIVE_CACHE_TTL_MS = 60 * 1000; // 1 minute

async function isUserActive(userId: string): Promise<boolean> {
  const now = Date.now();
  const cached = activeCache.get(userId);
  if (cached && cached.expiresAt > now) return cached.isActive;

  const row = await db('users').where({ id: userId }).select('is_active').first();
  // Treat missing row as inactive (defense in depth), nullable column as active
  // for legacy rows, explicit false as inactive.
  const isActive = row ? row.is_active !== false : false;
  activeCache.set(userId, { isActive, expiresAt: now + ACTIVE_CACHE_TTL_MS });
  return isActive;
}

export function invalidateActiveCache(userId: string) {
  activeCache.delete(userId);
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, API_ERRORS.UNAUTHORIZED, '인증 토큰이 필요합니다');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = JWTService.verifyAccessToken(token);

    // Reject tokens belonging to deactivated users. Bounded by a short TTL
    // cache so this doesn't add a DB roundtrip per request.
    const active = await isUserActive(payload.userId);
    if (!active) {
      throw new AppError(403, API_ERRORS.FORBIDDEN, '비활성화된 계정입니다');
    }

    // Attach user to request
    req.user = payload;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(401, API_ERRORS.UNAUTHORIZED, '유효하지 않은 인증 토큰입니다'));
    }
  }
}

// optionalAuthMiddleware removed — it was unused and would silently treat
// invalid tokens as anonymous, which is a footgun for any future write
// endpoint. If you need it back, prefer explicit handling at the route.
