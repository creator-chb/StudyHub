/**
 * 错误处理中间件
 * 统一处理所有错误
 */

import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
    status?: number;
}

/**
 * 创建错误对象
 */
export function createError(message: string, status: number): AppError {
    const error: AppError = new Error(message);
    error.status = status;
    return error;
}

/**
 * 全局错误处理中间件
 */
export function errorHandler(
    err: AppError,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    console.error('[Error]', err.message, err.stack);

    const status = err.status || 500;
    const message = status === 500 ? '服务器内部错误' : err.message;

    res.status(status).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        success: false,
        message: `路由 ${req.method} ${req.path} 不存在`,
    });
}
