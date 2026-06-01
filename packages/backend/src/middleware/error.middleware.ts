import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { API_ERRORS } from '@cotion/shared';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: API_ERRORS.VALIDATION_ERROR,
        message: '입력 데이터가 유효하지 않습니다',
        details: error.errors,
      },
    });
  }

  if (error instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: '파일 크기가 너무 큽니다 (최대 50MB)',
      LIMIT_UNEXPECTED_FILE: '허용되지 않는 파일 필드입니다',
    };
    return res.status(400).json({
      success: false,
      error: {
        code: API_ERRORS.VALIDATION_ERROR,
        message: messages[error.code] || `파일 업로드 오류: ${error.code}`,
      },
    });
  }

  // multer fileFilter에서 던진 일반 Error (허용되지 않는 파일 형식)
  if (error.message && error.message.includes('허용되지 않는 파일 형식')) {
    return res.status(400).json({
      success: false,
      error: {
        code: API_ERRORS.VALIDATION_ERROR,
        message: error.message,
      },
    });
  }

  // Always log the full error server-side for debugging
  console.error('Unhandled error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack?.split('\n').slice(0, 5).join('\n'),
  });

  // ─── Friendly translations for common pg errors ────────────────
  // The user shouldn't see "column "kakao_id" of relation "clients" does
  // not exist". Catch known patterns and surface actionable text.
  const pgCode = (error as any).code as string | undefined;
  const pgMessage = String(error.message || '');
  const isDev = process.env.NODE_ENV !== 'production';

  if (pgCode === '42703' || /column .* does not exist/i.test(pgMessage)) {
    // pg 42703 most commonly means "code references a column the DB
    // doesn't have" — usually missed migrations after deploy, but also
    // possible for a coding bug (typo'd column name). Phrase the user
    // message generically; ops can read devMessage / server log to
    // distinguish.
    return res.status(503).json({
      success: false,
      error: {
        code: 'SCHEMA_OUT_OF_SYNC',
        message: '코드와 DB 스키마가 일치하지 않습니다. 관리자에게 알려주세요.',
        ...(isDev ? { devMessage: error.message } : {}),
      },
    });
  }

  if (pgCode === '23505') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: '이미 같은 값이 존재합니다.',
        ...(isDev ? { devMessage: error.message } : {}),
      },
    });
  }

  if (pgCode === '23503') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'FK_VIOLATION',
        message: '연결된 데이터가 없거나 이미 삭제됐습니다.',
        ...(isDev ? { devMessage: error.message } : {}),
      },
    });
  }

  // Never echo raw error.message to clients — it can leak DB column names,
  // file paths, library internals, etc. Detailed info stays in server logs.
  return res.status(500).json({
    success: false,
    error: {
      code: API_ERRORS.INTERNAL_ERROR,
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      ...(isDev ? { devMessage: error.message } : {}),
    },
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
