"use strict";
/**
 * 缓存工具模块
 * 提供 Redis 缓存的封装方法
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = exports.taskCache = exports.categoryCache = exports.linkCache = void 0;
const redis_js_1 = require("../db/redis.js");
// 缓存键前缀
const CACHE_PREFIX = 'studyhub:cache';
// 默认 TTL（秒）
const DEFAULT_TTL = {
    LINK: 300, // 5 分钟
    CATEGORY: 600, // 10 分钟
    TASK: 120, // 2 分钟
    USER: 300, // 5 分钟
};
/**
 * 生成缓存键
 */
function generateKey(resource, userId, resourceId) {
    if (resourceId) {
        return `${CACHE_PREFIX}:${resource}:${userId}:${resourceId}`;
    }
    return `${CACHE_PREFIX}:${resource}:${userId}`;
}
/**
 * 缓存包装器 - 链接
 */
exports.linkCache = {
    /**
     * 获取缓存的链接
     */
    async get(userId, linkId) {
        const key = generateKey('link', userId, linkId);
        return (0, redis_js_1.getCache)(key);
    },
    /**
     * 设置链接缓存
     */
    async set(userId, linkId, data, ttl = DEFAULT_TTL.LINK) {
        const key = generateKey('link', userId, linkId);
        await (0, redis_js_1.setCache)(key, data, ttl);
    },
    /**
     * 删除链接缓存
     */
    async del(userId, linkId) {
        const key = generateKey('link', userId, linkId);
        await (0, redis_js_1.deleteCache)(key);
    },
    /**
     * 清除用户的所有链接缓存
     */
    async delUserLinks(userId) {
        const pattern = `${CACHE_PREFIX}:link:${userId}:*`;
        await (0, redis_js_1.deleteCachePattern)(pattern);
    },
};
/**
 * 缓存包装器 - 分类
 */
exports.categoryCache = {
    /**
     * 获取缓存的分类
     */
    async get(userId, categoryId) {
        const key = generateKey('category', userId, categoryId);
        return (0, redis_js_1.getCache)(key);
    },
    /**
     * 设置分类缓存
     */
    async set(userId, categoryId, data, ttl = DEFAULT_TTL.CATEGORY) {
        const key = generateKey('category', userId, categoryId);
        await (0, redis_js_1.setCache)(key, data, ttl);
    },
    /**
     * 删除分类缓存
     */
    async del(userId, categoryId) {
        const key = generateKey('category', userId, categoryId);
        await (0, redis_js_1.deleteCache)(key);
    },
    /**
     * 清除用户的所有分类缓存
     */
    async delUserCategories(userId) {
        const pattern = `${CACHE_PREFIX}:category:${userId}:*`;
        await (0, redis_js_1.deleteCachePattern)(pattern);
    },
};
/**
 * 缓存包装器 - 任务
 */
exports.taskCache = {
    /**
     * 获取缓存的任务
     */
    async get(userId, taskId) {
        const key = generateKey('task', userId, taskId);
        return (0, redis_js_1.getCache)(key);
    },
    /**
     * 设置任务缓存
     */
    async set(userId, taskId, data, ttl = DEFAULT_TTL.TASK) {
        const key = generateKey('task', userId, taskId);
        await (0, redis_js_1.setCache)(key, data, ttl);
    },
    /**
     * 删除任务缓存
     */
    async del(userId, taskId) {
        const key = generateKey('task', userId, taskId);
        await (0, redis_js_1.deleteCache)(key);
    },
    /**
     * 清除用户的所有任务缓存
     */
    async delUserTasks(userId) {
        const pattern = `${CACHE_PREFIX}:task:${userId}:*`;
        await (0, redis_js_1.deleteCachePattern)(pattern);
    },
};
/**
 * 通用缓存方法
 */
exports.cache = {
    /**
     * 获取缓存
     */
    async get(key) {
        return (0, redis_js_1.getCache)(key);
    },
    /**
     * 设置缓存
     */
    async set(key, data, ttl) {
        await (0, redis_js_1.setCache)(key, data, ttl);
    },
    /**
     * 删除缓存
     */
    async del(key) {
        await (0, redis_js_1.deleteCache)(key);
    },
    /**
     * 按模式删除缓存
     */
    async delPattern(pattern) {
        await (0, redis_js_1.deleteCachePattern)(pattern);
    },
    /**
     * 清除用户的所有缓存
     */
    async clearUserCache(userId) {
        const pattern = `${CACHE_PREFIX}:*:${userId}:*`;
        await (0, redis_js_1.deleteCachePattern)(pattern);
    },
};
exports.default = exports.cache;
//# sourceMappingURL=cache.js.map