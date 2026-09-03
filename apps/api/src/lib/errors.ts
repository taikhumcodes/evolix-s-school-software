import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.js';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    details: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details: Record<string, any> = {}) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details: Record<string, any> = {}) {
    super(message, 403, 'PERMISSION_DENIED', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found', details: Record<string, any> = {}) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', details: Record<string, any> = {}) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details: Record<string, any> = {}) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'root';
      if (!formattedErrors[key]) formattedErrors[key] = [];
      formattedErrors[key].push(issue.message);
    }
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: formattedErrors,
      },
    });
    return;
  }

  // Handle Multer upload errors
  if (err?.name === 'MulterError' || err?.code === 'LIMIT_FILE_SIZE') {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.code === 'LIMIT_FILE_SIZE' ? 'File size exceeds maximum limit of 5MB' : err.message,
        details: {},
      },
    });
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Fallback for unhandled server errors
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled internal server error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred',
      details: {},
    },
  });
}
