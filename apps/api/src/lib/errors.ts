import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
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

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details: Record<string, any> = {}, code: string = 'BAD_REQUEST') {
    super(message, 400, details.code || code, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details: Record<string, any> = {}) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details: Record<string, any> = {}, code: string = 'PERMISSION_DENIED') {
    super(message, 403, details.code || code, details);
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
      message: 'Invalid request data',
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
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File size exceeds maximum limit of 5MB' : err.message;
    res.status(422).json({
      message: msg,
      error: {
        code: 'VALIDATION_ERROR',
        message: msg,
        details: {},
      },
    });
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      ...(err.details || {}),
      message: err.message,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
      const msg = `A record with this ${target} already exists.`;
      res.status(409).json({
        message: msg,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: msg,
          details: { target: err.meta?.target },
        },
      });
      return;
    }
    if (err.code === 'P2025') {
      const msg = 'Requested record was not found or has already been removed.';
      res.status(404).json({
        message: msg,
        error: {
          code: 'NOT_FOUND',
          message: msg,
          details: {},
        },
      });
      return;
    }
    if (err.code === 'P2003') {
      const msg = 'Operation violates a relational dependency constraint.';
      res.status(400).json({
        message: msg,
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: msg,
          details: { field: err.meta?.field_name },
        },
      });
      return;
    }
  }

  // Fallback for unhandled server errors
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled internal server error');
  res.status(500).json({
    message: 'An unexpected internal error occurred',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred',
      details: {},
    },
  });
}
