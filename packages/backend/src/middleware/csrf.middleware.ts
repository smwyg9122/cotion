import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { ActivityLogService } from '../services/activity-log.service';

/**
 * Defense-in-depth CSRF protection for COOKIE-AUTHENTICATED endpoints.
 *
 * The bulk of the API uses Bearer tokens in the Authorization header which
 * cannot be sent cross-origin by a browser without explicit user action,
 * so those routes are immune to traditional CSRF. The exceptions are
 * /auth/refresh and /auth/logout — they read the refresh cookie set by
 * the server and would otherwise be triggerable via a hostile site doing
 * `fetch('/api/auth/refresh', { credentials: 'include' })` if the user
 * happens to be logged in.
 *
 * SameSite=Lax on the cookie already blocks most cross-site scenarios in
 * modern browsers, but we add Origin/Referer allowlist verification for
 * defense-in-depth and to cover older clients / weird browser bugs.
 *
 * Methods other than POST/PUT/PATCH/DELETE are not checked — GETs that
 * carry the cookie are read-only.
 */

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function buildAllowlist(): Set<string> {
  // CORS_ORIGIN is already restricted via env to known FE origins, so reuse it.
  // It may be a single value or comma-separated; normalize.
  const raw = String(config.cors?.origin ?? '');
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set(list);
}

const ALLOWED_ORIGINS = buildAllowlist();

function normalizeOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

/**
 * Block mutating requests whose Origin/Referer doesn't match the CORS
 * allowlist. Returns 403 with a clear error code so debugging is easy.
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  // Prefer Origin (more reliable when present); fall back to Referer.
  const origin =
    normalizeOrigin(req.headers.origin as string | undefined) ||
    normalizeOrigin(req.headers.referer as string | undefined);

  // If neither Origin nor Referer is present at all, this is almost
  // certainly a same-origin request from a non-browser client (curl,
  // backend job, mobile app). Allow it — Bearer-token auth elsewhere
  // catches abuse.
  if (!origin) return next();

  if (!ALLOWED_ORIGINS.has(origin)) {
    // We don't have req.user here (this runs before authMiddleware on some
    // routes), but log anyway so the security feed shows the attempt.
    ActivityLogService.security(null, 'csrf_block', {
      origin,
      method: req.method,
      path: req.path,
    });
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_BLOCKED',
        message: `Origin '${origin}'는 허용되지 않은 출처입니다.`,
      },
    });
  }

  next();
}
