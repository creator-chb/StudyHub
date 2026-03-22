/**
 * 响应缓存中间件
 * 缓存 API 响应以提高性能
 */

import { Request, Response, NextFunction } from 'express';
import { getCache, setCache, deleteCachePattern } from '../db/redis.js';

interface CacheConfig {
    ttl: number;           // 缓存时间（秒）
    keyGenerator?: (req: Request) => string;
}

// 默认缓存配置
const defaultConfig: CacheConfig = {
    ttl: 300, // 5 分钟
};

/**
 * 生成缓存键
 */
function generateCacheKey(req: Request): string {
    const userId = (req as unknown as { user?: { userId: string } }).user?.userId || 'anonymous';
    const path = req.originalUrl || req.url;
    return `studyhub:response:${userId}:${path}`;
}

/**
 * 创建响应缓存中间件
 */
export function createResponseCache(config: CacheConfig = defaultConfig) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // 只缓存 GET 请求
        if (req.method !== 'GET') {
            next();
            return;
        }

        const cacheKey = config.keyGenerator ? config.keyGenerator(req) : generateCacheKey(req);

        try {
            // 尝试从缓存获取
            const cachedData = await getCache<{ body: unknown; statusCode: number }>(cacheKey);

            if (cachedData) {
                console.log('[Cache] 命中:', cacheKey);
                res.setHeader('X-Cache', 'HIT');
                res.status(cachedData.statusCode).json(cachedData.body);
                return;
            }

            // 未命中缓存，继续处理请求
            const originalJson = res.json.bind(res);
            const originalStatus = res.status.bind(res);

            let statusCode = 200;

            // 重写 status 方法
            res.status = function(code: number): Response {
                statusCode = code;
                return originalStatus(code);
            };

            // 重写 json 方法
            res.json = function(body: unknown): Response {
                // 只缓存成功的响应
                if (statusCode >= 200 && statusCode < 300) {
                    setCache(cacheKey, { body, statusCode }, config.ttl).catch((err: Error) => {
                        console.error('[Cache] 缓存设置失败:', err.message);
                    });
                }

                res.setHeader('X-Cache', 'MISS');
                return originalJson(body);
            };

            next();
        } catch (error) {
            console.error('[Cache] 缓存中间件错误:', error);
            next();
        }
    };
}

/**
 * 清除响应缓存
 */
export async function clearResponseCache(userId?: string): Promise<void> {
    const pattern = userId
        ? `studyhub:response:${userId}:*`
        : 'studyhub:response:*';
    await deleteCachePattern(pattern);
}

/**
 * 链接列表缓存中间件（5 分钟）
 */
export const linksCache = createResponseCache({ ttl: 300 });

/**
 * 分类列表缓存中间件（10 分钟）
 */
export const categoriesCache = createResponseCache({ ttl: 600 });

/**
 * 任务列表缓存中间件（2 分钟）
 */
export const tasksCache = createResponseCache({ ttl: 120 });

export default createResponseCache;
