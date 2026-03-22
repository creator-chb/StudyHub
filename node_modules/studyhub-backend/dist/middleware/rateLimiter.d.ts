/**
 * 速率限制中间件
 * 基于 Redis 实现 API 请求速率限制
 */
import { Request, Response, NextFunction } from 'express';
interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    message?: string;
}
export declare const rateLimitConfigs: {
    auth: {
        windowMs: number;
        maxRequests: number;
        message: string;
    };
    api: {
        windowMs: number;
        maxRequests: number;
    };
    export: {
        windowMs: number;
        maxRequests: number;
        message: string;
    };
    import: {
        windowMs: number;
        maxRequests: number;
        message: string;
    };
};
/**
 * 创建速率限制中间件
 */
export declare function createRateLimiter(config?: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 认证接口速率限制
 */
export declare const authRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 导出接口速率限制
 */
export declare const exportRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 导入接口速率限制
 */
export declare const importRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 通用 API 速率限制
 */
export declare const apiRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export default createRateLimiter;
//# sourceMappingURL=rateLimiter.d.ts.map