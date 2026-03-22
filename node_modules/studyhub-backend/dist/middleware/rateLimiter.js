"use strict";
/**
 * 速率限制中间件
 * 基于 Redis 实现 API 请求速率限制
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRateLimiter = exports.importRateLimiter = exports.exportRateLimiter = exports.authRateLimiter = exports.rateLimitConfigs = void 0;
exports.createRateLimiter = createRateLimiter;
const redis_js_1 = require("../db/redis.js");
// 默认配置
const defaultConfig = {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 100, // 100 次请求
    message: '请求过于频繁，请稍后再试',
};
// 不同路由的配置
exports.rateLimitConfigs = {
    // 认证接口：5 次/分钟
    auth: {
        windowMs: 60 * 1000,
        maxRequests: 5,
        message: '登录尝试次数过多，请稍后再试',
    },
    // 普通 API：100 次/分钟
    api: {
        windowMs: 60 * 1000,
        maxRequests: 100,
    },
    // 导出接口：10 次/小时
    export: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
        message: '导出次数已达上限，请稍后再试',
    },
    // 导入接口：20 次/小时
    import: {
        windowMs: 60 * 60 * 1000,
        maxRequests: 20,
        message: '导入次数已达上限，请稍后再试',
    },
};
/**
 * 获取客户端 IP
 */
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}
/**
 * 创建速率限制中间件
 */
function createRateLimiter(config = defaultConfig) {
    return async (req, res, next) => {
        const clientIp = getClientIp(req);
        const route = req.route?.path || req.path;
        const key = `ratelimit:${clientIp}:${route}`;
        try {
            const windowSeconds = Math.ceil(config.windowMs / 1000);
            const currentCount = await (0, redis_js_1.incrementRateLimit)(key, windowSeconds);
            // 设置响应头
            res.setHeader('X-RateLimit-Limit', config.maxRequests);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - currentCount));
            res.setHeader('X-RateLimit-Window', `${windowSeconds}s`);
            if (currentCount > config.maxRequests) {
                res.status(429).json({
                    success: false,
                    message: config.message || defaultConfig.message,
                    retryAfter: windowSeconds,
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('[RateLimiter] 速率限制检查失败:', error);
            // 如果 Redis 出错，允许请求通过（降级处理）
            next();
        }
    };
}
/**
 * 认证接口速率限制
 */
exports.authRateLimiter = createRateLimiter(exports.rateLimitConfigs.auth);
/**
 * 导出接口速率限制
 */
exports.exportRateLimiter = createRateLimiter(exports.rateLimitConfigs.export);
/**
 * 导入接口速率限制
 */
exports.importRateLimiter = createRateLimiter(exports.rateLimitConfigs.import);
/**
 * 通用 API 速率限制
 */
exports.apiRateLimiter = createRateLimiter(exports.rateLimitConfigs.api);
exports.default = createRateLimiter;
//# sourceMappingURL=rateLimiter.js.map