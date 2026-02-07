import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
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

  return res.status(500).json({
    success: false,
    error: {
      code: API_ERRORS.INTERNAL_ERROR,
      message: '서버 오류가 발생했습니다',
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
