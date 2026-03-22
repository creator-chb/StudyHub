/**
 * 响应缓存中间件
 * 缓存 API 响应以提高性能
 */
import { Request, Response, NextFunction } from 'express';
interface CacheConfig {
    ttl: number;
    keyGenerator?: (req: Request) => string;
}
/**
 * 创建响应缓存中间件
 */
export declare function createResponseCache(config?: CacheConfig): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 清除响应缓存
 */
export declare function clearResponseCache(userId?: string): Promise<void>;
/**
 * 链接列表缓存中间件（5 分钟）
 */
export declare const linksCache: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 分类列表缓存中间件（10 分钟）
 */
export declare const categoriesCache: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 任务列表缓存中间件（2 分钟）
 */
export declare const tasksCache: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export default createResponseCache;
//# sourceMappingURL=cache.d.ts.map