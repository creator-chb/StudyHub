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
export declare function createError(message: string, status: number): AppError;
/**
 * 全局错误处理中间件
 */
export declare function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction): void;
/**
 * 404 处理中间件
 */
export declare function notFoundHandler(req: Request, res: Response): void;
//# sourceMappingURL=errorHandler.d.ts.map