/**
 * StudyHub LocalStorage 存储适配器
 * 基于 AbstractStorage 接口，使用 localStorage 实现数据持久化
 * @module LocalStorageAdapter
 */

const LocalStorageAdapter = (function() {
    'use strict';

    /**
     * 数据存储键名映射
     * @type {Object}
     */
    const keys = {
        links: 'studyhub_links',
        tasks: 'studyhub_tasks',
        categories: 'studyhub_categories',
        settings: 'studyhub_settings'
    };

    // 创建基类实例
    const adapter = AbstractStorage.create();

    // =============================================
    // 覆盖抽象方法
    // =============================================

    /**
     * 获取数据
     * @param {string} key - 数据键名
     * @param {*} defaultValue - 默认值
     * @returns {*} 存储的数据
     */
    adapter.get = function(key, defaultValue = []) {
        try {
            const data = localStorage.getItem(keys[key]);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(`读取 ${key} 失败:`, e);
            return defaultValue;
        }
    };

    /**
     * 保存数据
     * @param {string} key - 数据键名
     * @param {*} value - 要存储的数据
     * @returns {boolean} 是否成功
     */
    adapter.set = function(key, value) {
        try {
            localStorage.setItem(keys[key], JSON.stringify(value));
            this._emit(key, value);
            return true;
        } catch (e) {
            console.error(`保存 ${key} 失败:`, e);
            return false;
        }
    };

    /**
     * 删除数据
     * @param {string} key - 数据键名
     * @returns {boolean} 是否成功
     */
    adapter.remove = function(key) {
        try {
            localStorage.removeItem(keys[key]);
            this._emit(key, null);
            return true;
        } catch (e) {
            console.error(`删除 ${key} 失败:`, e);
            return false;
        }
    };

    /**
     * 清空所有 StudyHub 数据
     * @returns {boolean} 是否成功
     */
    adapter.clear = function() {
        try {
            Object.keys(keys).forEach(key => {
                localStorage.removeItem(keys[key]);
            });
            return true;
        } catch (e) {
            console.error('清空数据失败:', e);
            return false;
        }
    };

    /**
     * 获取存储使用情况
     * @returns {Object} 使用情况信息
     */
    adapter.getUsage = function() {
        let totalSize = 0;
        const details = {};

        Object.keys(keys).forEach(key => {
            const data = localStorage.getItem(keys[key]);
            if (data) {
                const size = new Blob([data]).size;
                totalSize += size;
                details[key] = {
                    size: size,
                    sizeFormatted: this.formatBytes(size),
                    itemCount: Array.isArray(JSON.parse(data)) ? JSON.parse(data).length : 1
                };
            }
        });

        return {
            totalSize,
            totalSizeFormatted: this.formatBytes(totalSize),
            details
        };
    };

    return adapter;
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalStorageAdapter;
}
