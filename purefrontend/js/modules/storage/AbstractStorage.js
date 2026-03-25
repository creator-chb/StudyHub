/**
 * StudyHub 抽象存储基类
 * 定义存储适配器必须实现的接口规范
 * @module AbstractStorage
 */

const AbstractStorage = (function() {
    'use strict';

    function create() {
        const listeners = new Map();

        return {
            get(key, defaultValue) {
                throw new Error('AbstractStorage: get() 方法未实现');
            },

            set(key, value) {
                throw new Error('AbstractStorage: set() 方法未实现');
            },

            remove(key) {
                throw new Error('AbstractStorage: remove() 方法未实现');
            },

            clear() {
                throw new Error('AbstractStorage: clear() 方法未实现');
            },

            getUsage() {
                throw new Error('AbstractStorage: getUsage() 方法未实现');
            },

            subscribe(key, callback) {
                if (!listeners.has(key)) listeners.set(key, new Set());
                listeners.get(key).add(callback);
            },

            unsubscribe(key, callback) {
                if (listeners.has(key)) listeners.get(key).delete(callback);
            },

            _emit(key, data) {
                if (listeners.has(key)) {
                    listeners.get(key).forEach(callback => {
                        try { callback(data); } catch (e) { console.error('Storage 事件处理错误:', e); }
                    });
                }
            },

            exportAll() {
                return {
                    version: '1.0.0-pure',
                    exportTime: new Date().toISOString(),
                    links: this.get('links', []),
                    tasks: this.get('tasks', []),
                    categories: this.get('categories', []),
                    settings: this.get('settings', {})
                };
            },

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

                    if (Array.isArray(data.categories)) {
                        if (options.merge) {
                            const existingCategories = this.get('categories', []);
                            const existingIds = new Set(existingCategories.map(c => c.id));
                            const newCategories = data.categories.filter(c => !existingIds.has(c.id));
                            this.set('categories', [...existingCategories, ...newCategories]);
                            result.categories.imported = newCategories.length;
                        } else {
                            this.set('categories', data.categories);
                            result.categories.imported = data.categories.length;
                        }
                    }

                    if (data.settings && typeof data.settings === 'object') {
                        this.set('settings', data.settings);
                    }

                    return { success: true, message: '数据导入成功', details: result };
                } catch (e) {
                    console.error('导入数据失败:', e);
                    return { success: false, message: '导入失败: ' + e.message, details: null };
                }
            },

            validateImport(data) {
                const errors = [];

                if (!data || typeof data !== 'object') {
                    errors.push('数据格式无效');
                    return { valid: false, errors };
                }

                if (!data.version) errors.push('缺少版本信息');
                if (data.links !== undefined && !Array.isArray(data.links)) errors.push('links 必须是数组');
                if (data.tasks !== undefined && !Array.isArray(data.tasks)) errors.push('tasks 必须是数组');
                if (data.categories !== undefined && !Array.isArray(data.categories)) errors.push('categories 必须是数组');

                return { valid: errors.length === 0, errors };
            },

            formatBytes(bytes) {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            }
        };
    }

    return { create };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AbstractStorage;
}
