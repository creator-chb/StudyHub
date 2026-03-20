/**
 * StudyHub 抽象存储基类
 * 定义存储适配器必须实现的接口规范，提供事件系统和辅助方法的默认实现
 * @module AbstractStorage
 */

const AbstractStorage = (function() {
    'use strict';

    /**
     * 创建一个抽象存储基类实例
     * 抽象方法（get/set/remove/clear/getUsage）在调用时会抛出 Error，
     * 子类通过覆盖这些方法提供具体实现。
     * @returns {Object} 存储接口实例
     */
    function create() {
        /**
         * 事件监听器集合（每个实例独立）
         * @type {Map<string, Set<Function>>}
         */
        const listeners = new Map();

        return {
            // =============================================
            // 抽象方法 — 子类必须覆盖
            // =============================================

            /**
             * 获取数据
             * @abstract
             * @param {string} key - 数据键名
             * @param {*} defaultValue - 默认值
             * @returns {*} 存储的数据
             */
            get(key, defaultValue) {
                throw new Error('AbstractStorage: get() 方法未实现，子类必须覆盖此方法');
            },

            /**
             * 保存数据
             * @abstract
             * @param {string} key - 数据键名
             * @param {*} value - 要存储的数据
             * @returns {boolean} 是否成功
             */
            set(key, value) {
                throw new Error('AbstractStorage: set() 方法未实现，子类必须覆盖此方法');
            },

            /**
             * 删除数据
             * @abstract
             * @param {string} key - 数据键名
             * @returns {boolean} 是否成功
             */
            remove(key) {
                throw new Error('AbstractStorage: remove() 方法未实现，子类必须覆盖此方法');
            },

            /**
             * 清空所有 StudyHub 数据
             * @abstract
             * @returns {boolean} 是否成功
             */
            clear() {
                throw new Error('AbstractStorage: clear() 方法未实现，子类必须覆盖此方法');
            },

            /**
             * 获取存储使用情况
             * @abstract
             * @returns {Object} 使用情况信息
             */
            getUsage() {
                throw new Error('AbstractStorage: getUsage() 方法未实现，子类必须覆盖此方法');
            },

            // =============================================
            // 事件系统 — 共享默认实现
            // =============================================

            /**
             * 订阅数据变更事件
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
             * 取消订阅数据变更事件
             * @param {string} key - 数据键名
             * @param {Function} callback - 回调函数
             */
            unsubscribe(key, callback) {
                if (listeners.has(key)) {
                    listeners.get(key).delete(callback);
                }
            },

            /**
             * 触发数据变更事件（内部方法，子类 set/remove 后调用）
             * @protected
             * @param {string} key - 数据键名
             * @param {*} data - 变更后的数据
             */
            _emit(key, data) {
                if (listeners.has(key)) {
                    listeners.get(key).forEach(callback => {
                        try {
                            callback(data);
                        } catch (e) {
                            console.error('Storage 事件处理错误:', e);
                        }
                    });
                }
            },

            // =============================================
            // 辅助方法 — 基于 get/set 的默认实现，子类可按需覆盖
            // =============================================

            /**
             * 导出所有数据
             * @returns {Object} 完整数据对象
             */
            exportAll() {
                return {
                    version: '1.4.0',
                    exportTime: new Date().toISOString(),
                    links: this.get('links', []),
                    tasks: this.get('tasks', []),
                    categories: this.get('categories', []),
                    settings: this.get('settings', {})
                };
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
             * 验证导入数据格式
             * @param {Object} data - 要验证的数据
             * @returns {Object} 验证结果 { valid: boolean, errors: string[] }
             */
            validateImport(data) {
                const errors = [];

                if (!data || typeof data !== 'object') {
                    errors.push('数据格式无效');
                    return { valid: false, errors };
                }

                if (!data.version) {
                    errors.push('缺少版本信息');
                }

                if (data.links !== undefined && !Array.isArray(data.links)) {
                    errors.push('links 必须是数组');
                }

                if (data.tasks !== undefined && !Array.isArray(data.tasks)) {
                    errors.push('tasks 必须是数组');
                }

                if (data.categories !== undefined && !Array.isArray(data.categories)) {
                    errors.push('categories 必须是数组');
                }

                return { valid: errors.length === 0, errors };
            },

            /**
             * 格式化字节大小
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
    }

    /**
     * AbstractStorage 公共 API
     */
    return {
        /**
         * 创建一个新的存储基类实例
         * @returns {Object} 存储接口实例
         */
        create
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AbstractStorage;
}
