/**
 * Redis 客户端模块
 * 提供 Redis 连接和基础操作功能
 */
import Redis from 'ioredis';
declare const redis: Redis;
/**
 * 保存会话到 Redis
 * @param token - JWT Token
 * @param userId - 用户 ID
 * @param expiresIn - 过期时间（秒）
 */
export declare function saveSession(token: string, userId: string, expiresIn: number): Promise<void>;
/**
 * 获取会话信息
 * @param token - JWT Token
 * @returns 会话信息或 null
 */
export declare function getSession(token: string): Promise<{
    userId: string;
    createdAt: string;
} | null>;
/**
 * 删除会话
 * @param token - JWT Token
 */
export declare function deleteSession(token: string): Promise<void>;
/**
 * 删除用户的所有会话
 * @param userId - 用户 ID
 */
export declare function deleteAllUserSessions(userId: string): Promise<void>;
/**
 * 将 Token 加入黑名单
 * @param token - JWT Token
 * @param expiresIn - 过期时间（秒）
 */
export declare function blacklistToken(token: string, expiresIn: number): Promise<void>;
/**
 * 检查 Token 是否在黑名单中
 * @param token - JWT Token
 * @returns 是否在黑名单中
 */
export declare function isTokenBlacklisted(token: string): Promise<boolean>;
/**
 * 从缓存获取数据
 * @param key - 缓存键
 * @returns 缓存数据或 null
 */
export declare function getCache<T>(key: string): Promise<T | null>;
/**
 * 设置缓存数据
 * @param key - 缓存键
 * @param value - 缓存值
 * @param ttl - 过期时间（秒）
 */
export declare function setCache<T>(key: string, value: T, ttl: number): Promise<void>;
/**
 * 删除缓存
 * @param key - 缓存键
 */
export declare function deleteCache(key: string): Promise<void>;
/**
 * 按模式删除缓存
 * @param pattern - 匹配模式
 */
export declare function deleteCachePattern(pattern: string): Promise<void>;
/**
 * 增加请求计数
 * @param key - 速率限制键
 * @param windowSeconds - 时间窗口（秒）
 * @returns 当前计数
 */
export declare function incrementRateLimit(key: string, windowSeconds: number): Promise<number>;
/**
 * 获取请求计数
 * @param key - 速率限制键
 * @returns 当前计数
 */
export declare function getRateLimit(key: string): Promise<number>;
/**
 * 重置速率限制
 * @param key - 速率限制键
 */
export declare function resetRateLimit(key: string): Promise<void>;
export default redis;
//# sourceMappingURL=redis.d.ts.map