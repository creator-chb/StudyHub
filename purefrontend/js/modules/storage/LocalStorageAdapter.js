/**
 * StudyHub LocalStorage 存储适配器
 * 使用 localStorage 实现数据持久化
 * @module LocalStorageAdapter
 */

const LocalStorageAdapter = (function() {
    'use strict';

    const keys = {
        links: 'studyhub_links',
        tasks: 'studyhub_tasks',
        categories: 'studyhub_categories',
        settings: 'studyhub_settings'
    };

    const adapter = AbstractStorage.create();

    adapter.get = function(key, defaultValue = []) {
        try {
            const data = localStorage.getItem(keys[key]);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(`读取 ${key} 失败:`, e);
            return defaultValue;
        }
    };

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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalStorageAdapter;
}
