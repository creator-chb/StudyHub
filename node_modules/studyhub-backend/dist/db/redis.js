"use strict";
/**
 * Redis 客户端模块
 * 提供 Redis 连接和基础操作功能
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSession = saveSession;
exports.getSession = getSession;
exports.deleteSession = deleteSession;
exports.deleteAllUserSessions = deleteAllUserSessions;
exports.blacklistToken = blacklistToken;
exports.isTokenBlacklisted = isTokenBlacklisted;
exports.getCache = getCache;
exports.setCache = setCache;
exports.deleteCache = deleteCache;
exports.deleteCachePattern = deleteCachePattern;
exports.incrementRateLimit = incrementRateLimit;
exports.getRateLimit = getRateLimit;
exports.resetRateLimit = resetRateLimit;
const ioredis_1 = __importDefault(require("ioredis"));
const index_js_1 = __importDefault(require("../config/index.js"));
const redisConfig = {
    host: index_js_1.default.redis.host,
    port: index_js_1.default.redis.port,
    password: index_js_1.default.redis.password || undefined,
    db: index_js_1.default.redis.db,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
};
const redis = new ioredis_1.default(redisConfig);
// 连接事件处理
redis.on('connect', () => {
    console.log('[Redis] 已连接到 Redis 服务器');
});
redis.on('ready', () => {
    console.log('[Redis] Redis 客户端就绪');
});
redis.on('error', (err) => {
    console.error('[Redis] Redis 连接错误:', err.message);
});
redis.on('reconnecting', () => {
    console.log('[Redis] 正在重新连接...');
});
// =============================================
// Session 管理方法
// =============================================
/**
 * 保存会话到 Redis
 * @param token - JWT Token
 * @param userId - 用户 ID
 * @param expiresIn - 过期时间（秒）
 */
async function saveSession(token, userId, expiresIn) {
    const key = `session:${token}`;
    await redis.setex(key, expiresIn, JSON.stringify({ userId, createdAt: new Date().toISOString() }));
}
/**
 * 获取会话信息
 * @param token - JWT Token
 * @returns 会话信息或 null
 */
async function getSession(token) {
    const key = `session:${token}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
}
/**
 * 删除会话
 * @param token - JWT Token
 */
async function deleteSession(token) {
    const key = `session:${token}`;
    await redis.del(key);
}
/**
 * 删除用户的所有会话
 * @param userId - 用户 ID
 */
async function deleteAllUserSessions(userId) {
    const pattern = 'session:*';
    const keys = await redis.keys(pattern);
    for (const key of keys) {
        const session = await redis.get(key);
        if (session) {
            const data = JSON.parse(session);
            if (data.userId === userId) {
                await redis.del(key);
            }
        }
    }
}
/**
 * 将 Token 加入黑名单
 * @param token - JWT Token
 * @param expiresIn - 过期时间（秒）
 */
async function blacklistToken(token, expiresIn) {
    const key = `blacklist:${token}`;
    await redis.setex(key, expiresIn, '1');
}
/**
 * 检查 Token 是否在黑名单中
 * @param token - JWT Token
 * @returns 是否在黑名单中
 */
async function isTokenBlacklisted(token) {
    const key = `blacklist:${token}`;
    const result = await redis.exists(key);
    return result === 1;
}
// =============================================
// 缓存操作方法
// =============================================
/**
 * 从缓存获取数据
 * @param key - 缓存键
 * @returns 缓存数据或 null
 */
async function getCache(key) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
}
/**
 * 设置缓存数据
 * @param key - 缓存键
 * @param value - 缓存值
 * @param ttl - 过期时间（秒）
 */
async function setCache(key, value, ttl) {
    await redis.setex(key, ttl, JSON.stringify(value));
}
/**
 * 删除缓存
 * @param key - 缓存键
 */
async function deleteCache(key) {
    await redis.del(key);
}
/**
 * 按模式删除缓存
 * @param pattern - 匹配模式
 */
async function deleteCachePattern(pattern) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
}
// =============================================
// 速率限制方法
// =============================================
/**
 * 增加请求计数
 * @param key - 速率限制键
 * @param windowSeconds - 时间窗口（秒）
 * @returns 当前计数
 */
async function incrementRateLimit(key, windowSeconds) {
    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, windowSeconds);
    const results = await multi.exec();
    return results?.[0]?.[1] || 1;
}
/**
 * 获取请求计数
 * @param key - 速率限制键
 * @returns 当前计数
 */
async function getRateLimit(key) {
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
}
/**
 * 重置速率限制
 * @param key - 速率限制键
 */
async function resetRateLimit(key) {
    await redis.del(key);
}
exports.default = redis;
//# sourceMappingURL=redis.js.map