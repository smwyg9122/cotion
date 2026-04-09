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
      LIMIT_FILE_SIZE: '파일 크기가 너무 큽니다 (최대 10MB)',
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

  return res.status(500).json({
    success: false,
    error: {
      code: API_ERRORS.INTERNAL_ERROR,
      message: process.env.NODE_ENV === 'production'
        ? '서버 오류가 발생했습니다'
        : `서버 오류: ${error.message}`,
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
