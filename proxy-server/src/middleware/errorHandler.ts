import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error details
  console.error(`[Error ${status}] ${req.method} ${req.url}:`, {
    message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const responseMessage = process.env.NODE_ENV === 'production' 
    ? (status >= 500 ? 'Internal Server Error' : message)
    : message;

  res.status(status).json({
    error: true,
    status,
    message: responseMessage,
    timestamp: new Date().toISOString(),
    path: req.url,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};