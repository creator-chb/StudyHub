/**
 * StudyHub 存储管理模块
 * 统一封装 localStorage 操作，支持数据导入导出
 * @module Storage
 */

const Storage = (function() {
    'use strict';

    /**
     * 数据存储键名
     * @type {Object}
     */
    const keys = {
        links: 'studyhub_links',
        tasks: 'studyhub_tasks',
        categories: 'studyhub_categories',
        settings: 'studyhub_settings'
    };

    /**
     * 事件监听器集合
     * @type {Map}
     */
    const listeners = new Map();

    /**
     * 触发数据变更事件
     * @private
     * @param {string} key - 数据键名
     * @param {*} data - 变更后的数据
     */
    function emit(key, data) {
        if (listeners.has(key)) {
            listeners.get(key).forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error('事件处理错误:', e);
                }
            });
        }
    }

    /**
     * 存储模块公共 API
     */
    return {
        /**
         * 获取数据
         * @param {string} key - 数据键名
         * @param {*} defaultValue - 默认值
         * @returns {*} 存储的数据
         */
        get(key, defaultValue = []) {
            try {
                const data = localStorage.getItem(keys[key]);
                return data ? JSON.parse(data) : defaultValue;
            } catch (e) {
                console.error(`读取 ${key} 失败:`, e);
                return defaultValue;
            }
        },

        /**
         * 设置数据
         * @param {string} key - 数据键名
         * @param {*} value - 要存储的数据
         * @returns {boolean} 是否成功
         */
        set(key, value) {
            try {
                localStorage.setItem(keys[key], JSON.stringify(value));
                emit(key, value);
                return true;
            } catch (e) {
                console.error(`保存 ${key} 失败:`, e);
                return false;
            }
        },

        /**
         * 删除数据
         * @param {string} key - 数据键名
         * @returns {boolean} 是否成功
         */
        remove(key) {
            try {
                localStorage.removeItem(keys[key]);
                emit(key, null);
                return true;
            } catch (e) {
                console.error(`删除 ${key} 失败:`, e);
                return false;
            }
        },

        /**
         * 清空所有 StudyHub 数据
         * @returns {boolean} 是否成功
         */
        clear() {
            try {
                Object.keys(keys).forEach(key => {
                    localStorage.removeItem(keys[key]);
                });
                return true;
            } catch (e) {
                console.error('清空数据失败:', e);
                return false;
            }
        },

        /**
         * 订阅数据变更
         * @param {string} key - 数据键名
         * @param {Function} callback - 回调函数
         */
        subscribe(key, callback) {
            if (!listeners.has(key)) {
                listeners.set(key, new Set());
            }
            listeners.get(key).add(callback);
        },

        /**
         * 取消订阅
         * @param {string} key - 数据键名
         * @param {Function} callback - 回调函数
         */
        unsubscribe(key, callback) {
            if (listeners.has(key)) {
                listeners.get(key).delete(callback);
            }
        },

        /**
         * 导出所有数据
         * @returns {Object} 完整数据对象
         */
        exportAll() {
            const data = {
                version: '1.4.0',
                exportTime: new Date().toISOString(),
                links: this.get('links', []),
                tasks: this.get('tasks', []),
                categories: this.get('categories', []),
                settings: this.get('settings', {})
            };
            return data;
        },

        /**
         * 导入数据
         * @param {Object} data - 要导入的数据
         * @param {Object} options - 导入选项
         * @param {boolean} options.merge - 是否合并（true）还是覆盖（false）
         * @returns {Object} 导入结果 { success: boolean, message: string, details: Object }
         */
        importAll(data, options = { merge: false }) {
            try {
                // 验证数据格式
                if (!data || typeof data !== 'object') {
                    return { success: false, message: '无效的数据格式', details: null };
                }

                const result = {
                    links: { imported: 0, skipped: 0 },
                    tasks: { imported: 0, skipped: 0 },
                    categories: { imported: 0, skipped: 0 }
                };

                // 导入链接
                if (Array.isArray(data.links)) {
                    if (options.merge) {
                        const existingLinks = this.get('links', []);
                        const existingIds = new Set(existingLinks.map(l => l.id));
                        const newLinks = data.links.filter(l => !existingIds.has(l.id));
                        this.set('links', [...existingLinks, ...newLinks]);
                        result.links.imported = newLinks.length;
                        result.links.skipped = data.links.length - newLinks.length;
                    } else {
                        this.set('links', data.links);
                        result.links.imported = data.links.length;
                    }
                }

                // 导入任务
                if (Array.isArray(data.tasks)) {
                    if (options.merge) {
                        const existingTasks = this.get('tasks', []);
                        const existingIds = new Set(existingTasks.map(t => t.id));
                        const newTasks = data.tasks.filter(t => !existingIds.has(t.id));
                        this.set('tasks', [...existingTasks, ...newTasks]);
                        result.tasks.imported = newTasks.length;
                        result.tasks.skipped = data.tasks.length - newTasks.length;
                    } else {
                        this.set('tasks', data.tasks);
                        result.tasks.imported = data.tasks.length;
                    }
                }

                // 导入分类
                if (Array.isArray(data.categories)) {
                    if (options.merge) {
                        const existingCategories = this.get('categories', []);
                        const existingIds = new Set(existingCategories.map(c => c.id));
                        const newCategories = data.categories.filter(c => !existingIds.has(c.id));
                        this.set('categories', [...existingCategories, ...newCategories]);
                        result.categories.imported = newCategories.length;
                        result.categories.skipped = data.categories.length - newCategories.length;
                    } else {
                        this.set('categories', data.categories);
                        result.categories.imported = data.categories.length;
                    }
                }

                // 导入设置
                if (data.settings && typeof data.settings === 'object') {
                    this.set('settings', data.settings);
                }

                return {
                    success: true,
                    message: '数据导入成功',
                    details: result
                };
            } catch (e) {
                console.error('导入数据失败:', e);
                return { success: false, message: '导入失败: ' + e.message, details: null };
            }
        },

        /**
         * 验证导入数据
         * @param {Object} data - 要验证的数据
         * @returns {Object} 验证结果 { valid: boolean, errors: string[] }
         */
        validateImport(data) {
            const errors = [];

            if (!data || typeof data !== 'object') {
                errors.push('数据格式无效');
                return { valid: false, errors };
            }

            // 检查版本
            if (!data.version) {
                errors.push('缺少版本信息');
            }

            // 验证链接数据
            if (data.links !== undefined && !Array.isArray(data.links)) {
                errors.push('links 必须是数组');
            }

            // 验证任务数据
            if (data.tasks !== undefined && !Array.isArray(data.tasks)) {
                errors.push('tasks 必须是数组');
            }

            // 验证分类数据
            if (data.categories !== undefined && !Array.isArray(data.categories)) {
                errors.push('categories 必须是数组');
            }

            return { valid: errors.length === 0, errors };
        },

        /**
         * 获取存储使用情况
         * @returns {Object} 使用情况信息
         */
        getUsage() {
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
        },

        /**
         * 格式化字节大小
         * @private
         * @param {number} bytes - 字节数
         * @returns {string} 格式化后的字符串
         */
        formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
