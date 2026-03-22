"use strict";
/**
 * 响应缓存中间件
 * 缓存 API 响应以提高性能
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksCache = exports.categoriesCache = exports.linksCache = void 0;
exports.createResponseCache = createResponseCache;
exports.clearResponseCache = clearResponseCache;
const redis_js_1 = require("../db/redis.js");
// 默认缓存配置
const defaultConfig = {
    ttl: 300, // 5 分钟
};
/**
 * 生成缓存键
 */
function generateCacheKey(req) {
    const userId = req.user?.userId || 'anonymous';
    const path = req.originalUrl || req.url;
    return `studyhub:response:${userId}:${path}`;
}
/**
 * 创建响应缓存中间件
 */
function createResponseCache(config = defaultConfig) {
    return async (req, res, next) => {
        // 只缓存 GET 请求
        if (req.method !== 'GET') {
            next();
            return;
        }
        const cacheKey = config.keyGenerator ? config.keyGenerator(req) : generateCacheKey(req);
        try {
            // 尝试从缓存获取
            const cachedData = await (0, redis_js_1.getCache)(cacheKey);
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
            res.status = function (code) {
                statusCode = code;
                return originalStatus(code);
            };
            // 重写 json 方法
            res.json = function (body) {
                // 只缓存成功的响应
                if (statusCode >= 200 && statusCode < 300) {
                    (0, redis_js_1.setCache)(cacheKey, { body, statusCode }, config.ttl).catch((err) => {
                        console.error('[Cache] 缓存设置失败:', err.message);
                    });
                }
                res.setHeader('X-Cache', 'MISS');
                return originalJson(body);
            };
            next();
        }
        catch (error) {
            console.error('[Cache] 缓存中间件错误:', error);
            next();
        }
    };
}
/**
 * 清除响应缓存
 */
async function clearResponseCache(userId) {
    const pattern = userId
        ? `studyhub:response:${userId}:*`
        : 'studyhub:response:*';
    await (0, redis_js_1.deleteCachePattern)(pattern);
}
/**
 * 链接列表缓存中间件（5 分钟）
 */
exports.linksCache = createResponseCache({ ttl: 300 });
/**
 * 分类列表缓存中间件（10 分钟）
 */
exports.categoriesCache = createResponseCache({ ttl: 600 });
/**
 * 任务列表缓存中间件（2 分钟）
 */
exports.tasksCache = createResponseCache({ ttl: 120 });
exports.default = createResponseCache;
//# sourceMappingURL=cache.js.map