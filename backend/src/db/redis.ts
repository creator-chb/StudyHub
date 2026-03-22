/**
 * Redis 客户端模块
 * 提供 Redis 连接和基础操作功能
 */

import Redis from 'ioredis';
import config from '../config/index.js';

const redisConfig = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    db: config.redis.db,
    retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
};

const redis = new Redis(redisConfig);

// 连接事件处理
redis.on('connect', () => {
    console.log('[Redis] 已连接到 Redis 服务器');
});

redis.on('ready', () => {
    console.log('[Redis] Redis 客户端就绪');
});

redis.on('error', (err: Error) => {
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
export async function saveSession(token: string, userId: string, expiresIn: number): Promise<void> {
    const key = `session:${token}`;
    await redis.setex(key, expiresIn, JSON.stringify({ userId, createdAt: new Date().toISOString() }));
}

/**
 * 获取会话信息
 * @param token - JWT Token
 * @returns 会话信息或 null
 */
export async function getSession(token: string): Promise<{ userId: string; createdAt: string } | null> {
    const key = `session:${token}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
}

/**
 * 删除会话
 * @param token - JWT Token
 */
export async function deleteSession(token: string): Promise<void> {
    const key = `session:${token}`;
    await redis.del(key);
}

/**
 * 删除用户的所有会话
 * @param userId - 用户 ID
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
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
export async function blacklistToken(token: string, expiresIn: number): Promise<void> {
    const key = `blacklist:${token}`;
    await redis.setex(key, expiresIn, '1');
}

/**
 * 检查 Token 是否在黑名单中
 * @param token - JWT Token
 * @returns 是否在黑名单中
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
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
export async function getCache<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
}

/**
 * 设置缓存数据
 * @param key - 缓存键
 * @param value - 缓存值
 * @param ttl - 过期时间（秒）
 */
export async function setCache<T>(key: string, value: T, ttl: number): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
}

/**
 * 删除缓存
 * @param key - 缓存键
 */
export async function deleteCache(key: string): Promise<void> {
    await redis.del(key);
}

/**
 * 按模式删除缓存
 * @param pattern - 匹配模式
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
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
export async function incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, windowSeconds);
    const results = await multi.exec();
    return results?.[0]?.[1] as number || 1;
}

/**
 * 获取请求计数
 * @param key - 速率限制键
 * @returns 当前计数
 */
export async function getRateLimit(key: string): Promise<number> {
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
}

/**
 * 重置速率限制
 * @param key - 速率限制键
 */
export async function resetRateLimit(key: string): Promise<void> {
    await redis.del(key);
}

export default redis;
