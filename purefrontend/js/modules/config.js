/**
 * StudyHub 配置中心模块
 * 集中管理应用的所有配置项
 * @module Config
 */

const Config = (function() {
    'use strict';

    /**
     * 默认配置
     * @type {Object}
     */
    const defaults = {
        // 版本信息
        version: '1.0.0-pure',
        
        // 存储配置
        storage: {
            prefix: 'studyhub_',
            keys: {
                links: 'links',
                tasks: 'tasks',
                settings: 'settings',
                categories: 'categories'
            }
        },
        
        // UI 配置
        ui: {
            // Toast 通知
            toast: {
                durations: {
                    success: 2000,
                    error: 3000,
                    info: 2500,
                    warning: 3000
                },
                maxVisible: 5
            },
            
            // 模态框
            modal: {
                animationDuration: 200,
                closeOnOverlay: true,
                closeOnEsc: true
            },
            
            // 分页/虚拟滚动
            pagination: {
                pageSize: 50,
                enableVirtualScroll: true,
                virtualScrollBuffer: 5
            }
        },
        
        // 功能限制
        limits: {
            maxLinks: 200,
            maxTasks: 100,
            maxCategories: 20,
            maxLinksPerTask: 10,
            maxOpenLinks: 5
        },
        
        // 任务优先级
        priorities: {
            high: { value: 3, label: '高', color: '#ef4444', icon: '🔴' },
            medium: { value: 2, label: '中', color: '#f59e0b', icon: '🟡' },
            low: { value: 1, label: '低', color: '#10b981', icon: '🟢' }
        },
        
        // 主题配置
        theme: {
            default: 'light',
            available: ['light', 'dark', 'auto']
        },
        
        // 快捷键
        shortcuts: {
            newLink: { key: 'n', ctrl: false, alt: false, description: '新建链接' },
            newTask: { key: 't', ctrl: false, alt: false, description: '新建任务' },
            search: { key: '/', ctrl: false, alt: false, description: '聚焦搜索' },
            toggleTheme: { key: 'd', ctrl: true, alt: false, description: '切换主题' },
            exportData: { key: 'e', ctrl: true, alt: false, description: '导出数据' },
            importData: { key: 'i', ctrl: true, alt: false, description: '导入数据' }
        }
    };

    /**
     * 当前配置（从 localStorage 合并）
     * @type {Object}
     */
    let currentConfig = { ...defaults };

    /**
     * 从 localStorage 加载用户配置
     * @private
     */
    function loadUserConfig() {
        try {
            const saved = localStorage.getItem('studyhub_settings');
            if (saved) {
                const userConfig = JSON.parse(saved);
                currentConfig = mergeDeep(defaults, userConfig);
            }
        } catch (e) {
            console.error('加载配置失败:', e);
        }
    }

    /**
     * 深度合并对象
     * @private
     * @param {Object} target - 目标对象
     * @param {Object} source - 源对象
     * @returns {Object} 合并后的对象
     */
    function mergeDeep(target, source) {
        const output = { ...target };
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(key => {
                if (isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = mergeDeep(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    /**
     * 检查是否为对象
     * @private
     * @param {*} item - 要检查的值
     * @returns {boolean}
     */
    function isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    // 初始化时加载用户配置
    loadUserConfig();

    /**
     * 配置模块公共 API
     */
    return {
        /**
         * 获取配置值
         * @param {string} path - 配置路径，如 'ui.toast.durations.success'
         * @param {*} defaultValue - 默认值
         * @returns {*} 配置值
         */
        get(path, defaultValue = null) {
            const keys = path.split('.');
            let value = currentConfig;
            
            for (const key of keys) {
                if (value === undefined || value === null) {
                    return defaultValue;
                }
                value = value[key];
            }
            
            return value !== undefined ? value : defaultValue;
        },

        /**
         * 设置配置值
         * @param {string} path - 配置路径
         * @param {*} value - 配置值
         */
        set(path, value) {
            const keys = path.split('.');
            let target = currentConfig;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!(keys[i] in target)) {
                    target[keys[i]] = {};
                }
                target = target[keys[i]];
            }
            
            target[keys[keys.length - 1]] = value;
            this.save();
        },

        /**
         * 保存配置到 localStorage
         */
        save() {
            try {
                localStorage.setItem('studyhub_settings', JSON.stringify(currentConfig));
            } catch (e) {
                console.error('保存配置失败:', e);
            }
        },

        /**
         * 重置为默认配置
         */
        reset() {
            currentConfig = { ...defaults };
            this.save();
        },

        /**
         * 获取所有配置
         * @returns {Object} 完整配置对象
         */
        getAll() {
            return { ...currentConfig };
        },

        /**
         * 获取存储键名
         * @param {string} key - 键名
         * @returns {string} 完整存储键名
         */
        getStorageKey(key) {
            return currentConfig.storage.prefix + currentConfig.storage.keys[key];
        },

        /**
         * 获取版本号
         * @returns {string} 版本号
         */
        getVersion() {
            return currentConfig.version;
        },

        /**
         * 检查功能开关状态
         * @param {string} feature - 功能名称
         * @returns {boolean} 是否启用
         */
        isFeatureEnabled(feature) {
            return this.get(`features.${feature}`, false) === true;
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
}
