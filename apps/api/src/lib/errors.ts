import type { ErrorCode } from '@rootlink/shared';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function createAppError(
  code: ErrorCode,
  message: string,
  statusCode = 400,
  details?: Record<string, unknown>,
): AppError {
  return new AppError(code, message, statusCode, details);
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

// ─── Zod validation error normalizer ─────────────────────────────────────────

import type { ZodError } from 'zod';

export function formatZodError(err: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.join('.') || '_root';
    fieldErrors[path] ??= [];
    fieldErrors[path].push(issue.message);
  }
  return fieldErrors;
}
