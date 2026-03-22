/**
 * 缓存工具模块
 * 提供 Redis 缓存的封装方法
 */
/**
 * 缓存包装器 - 链接
 */
export declare const linkCache: {
    /**
     * 获取缓存的链接
     */
    get(userId: string, linkId?: string): Promise<unknown | null>;
    /**
     * 设置链接缓存
     */
    set(userId: string, linkId: string | undefined, data: unknown, ttl?: number): Promise<void>;
    /**
     * 删除链接缓存
     */
    del(userId: string, linkId?: string): Promise<void>;
    /**
     * 清除用户的所有链接缓存
     */
    delUserLinks(userId: string): Promise<void>;
};
/**
 * 缓存包装器 - 分类
 */
export declare const categoryCache: {
    /**
     * 获取缓存的分类
     */
    get(userId: string, categoryId?: string): Promise<unknown | null>;
    /**
     * 设置分类缓存
     */
    set(userId: string, categoryId: string | undefined, data: unknown, ttl?: number): Promise<void>;
    /**
     * 删除分类缓存
     */
    del(userId: string, categoryId?: string): Promise<void>;
    /**
     * 清除用户的所有分类缓存
     */
    delUserCategories(userId: string): Promise<void>;
};
/**
 * 缓存包装器 - 任务
 */
export declare const taskCache: {
    /**
     * 获取缓存的任务
     */
    get(userId: string, taskId?: string): Promise<unknown | null>;
    /**
     * 设置任务缓存
     */
    set(userId: string, taskId: string | undefined, data: unknown, ttl?: number): Promise<void>;
    /**
     * 删除任务缓存
     */
    del(userId: string, taskId?: string): Promise<void>;
    /**
     * 清除用户的所有任务缓存
     */
    delUserTasks(userId: string): Promise<void>;
};
/**
 * 通用缓存方法
 */
export declare const cache: {
    /**
     * 获取缓存
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * 设置缓存
     */
    set<T>(key: string, data: T, ttl: number): Promise<void>;
    /**
     * 删除缓存
     */
    del(key: string): Promise<void>;
    /**
     * 按模式删除缓存
     */
    delPattern(pattern: string): Promise<void>;
    /**
     * 清除用户的所有缓存
     */
    clearUserCache(userId: string): Promise<void>;
};
export default cache;
//# sourceMappingURL=cache.d.ts.map