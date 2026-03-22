/**
 * 缓存工具模块
 * 提供 Redis 缓存的封装方法
 */

import { getCache, setCache, deleteCache, deleteCachePattern } from '../db/redis.js';

// 缓存键前缀
const CACHE_PREFIX = 'studyhub:cache';

// 默认 TTL（秒）
const DEFAULT_TTL = {
    LINK: 300,       // 5 分钟
    CATEGORY: 600,   // 10 分钟
    TASK: 120,       // 2 分钟
    USER: 300,       // 5 分钟
};

/**
 * 生成缓存键
 */
function generateKey(resource: string, userId: string, resourceId?: string): string {
    if (resourceId) {
        return `${CACHE_PREFIX}:${resource}:${userId}:${resourceId}`;
    }
    return `${CACHE_PREFIX}:${resource}:${userId}`;
}

/**
 * 缓存包装器 - 链接
 */
export const linkCache = {
    /**
     * 获取缓存的链接
     */
    async get(userId: string, linkId?: string): Promise<unknown | null> {
        const key = generateKey('link', userId, linkId);
        return getCache(key);
    },

    /**
     * 设置链接缓存
     */
    async set(userId: string, linkId: string | undefined, data: unknown, ttl = DEFAULT_TTL.LINK): Promise<void> {
        const key = generateKey('link', userId, linkId);
        await setCache(key, data, ttl);
    },

    /**
     * 删除链接缓存
     */
    async del(userId: string, linkId?: string): Promise<void> {
        const key = generateKey('link', userId, linkId);
        await deleteCache(key);
    },

    /**
     * 清除用户的所有链接缓存
     */
    async delUserLinks(userId: string): Promise<void> {
        const pattern = `${CACHE_PREFIX}:link:${userId}:*`;
        await deleteCachePattern(pattern);
    },
};

/**
 * 缓存包装器 - 分类
 */
export const categoryCache = {
    /**
     * 获取缓存的分类
     */
    async get(userId: string, categoryId?: string): Promise<unknown | null> {
        const key = generateKey('category', userId, categoryId);
        return getCache(key);
    },

    /**
     * 设置分类缓存
     */
    async set(userId: string, categoryId: string | undefined, data: unknown, ttl = DEFAULT_TTL.CATEGORY): Promise<void> {
        const key = generateKey('category', userId, categoryId);
        await setCache(key, data, ttl);
    },

    /**
     * 删除分类缓存
     */
    async del(userId: string, categoryId?: string): Promise<void> {
        const key = generateKey('category', userId, categoryId);
        await deleteCache(key);
    },

    /**
     * 清除用户的所有分类缓存
     */
    async delUserCategories(userId: string): Promise<void> {
        const pattern = `${CACHE_PREFIX}:category:${userId}:*`;
        await deleteCachePattern(pattern);
    },
};

/**
 * 缓存包装器 - 任务
 */
export const taskCache = {
    /**
     * 获取缓存的任务
     */
    async get(userId: string, taskId?: string): Promise<unknown | null> {
        const key = generateKey('task', userId, taskId);
        return getCache(key);
    },

    /**
     * 设置任务缓存
     */
    async set(userId: string, taskId: string | undefined, data: unknown, ttl = DEFAULT_TTL.TASK): Promise<void> {
        const key = generateKey('task', userId, taskId);
        await setCache(key, data, ttl);
    },

    /**
     * 删除任务缓存
     */
    async del(userId: string, taskId?: string): Promise<void> {
        const key = generateKey('task', userId, taskId);
        await deleteCache(key);
    },

    /**
     * 清除用户的所有任务缓存
     */
    async delUserTasks(userId: string): Promise<void> {
        const pattern = `${CACHE_PREFIX}:task:${userId}:*`;
        await deleteCachePattern(pattern);
    },
};

/**
 * 通用缓存方法
 */
export const cache = {
    /**
     * 获取缓存
     */
    async get<T>(key: string): Promise<T | null> {
        return getCache<T>(key);
    },

    /**
     * 设置缓存
     */
    async set<T>(key: string, data: T, ttl: number): Promise<void> {
        await setCache(key, data, ttl);
    },

    /**
     * 删除缓存
     */
    async del(key: string): Promise<void> {
        await deleteCache(key);
    },

    /**
     * 按模式删除缓存
     */
    async delPattern(pattern: string): Promise<void> {
        await deleteCachePattern(pattern);
    },

    /**
     * 清除用户的所有缓存
     */
    async clearUserCache(userId: string): Promise<void> {
        const pattern = `${CACHE_PREFIX}:*:${userId}:*`;
        await deleteCachePattern(pattern);
    },
};

export default cache;
