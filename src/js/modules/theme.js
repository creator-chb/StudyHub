/**
 * StudyHub 主题管理模块
 * 支持深色/浅色模式切换
 * @module Theme
 */

const Theme = (function() {
    'use strict';

    /**
     * 当前主题
     * @type {string}
     */
    let currentTheme = 'light';

    /**
     * 主题变更监听器
     * @type {Set}
     */
    const listeners = new Set();

    /**
     * 主题配置
     * @type {Object}
     */
    const themes = {
        light: {
            '--bg-primary': '#f5f7fa',
            '--bg-secondary': '#ffffff',
            '--bg-card': '#ffffff',
            '--text-primary': '#333333',
            '--text-secondary': '#666666',
            '--text-muted': '#888888',
            '--border-color': '#e5e7eb',
            '--primary-color': '#4f8cff',
            '--primary-hover': '#3b6fdc',
            '--danger-color': '#ff5c5c',
            '--danger-hover': '#d64545',
            '--success-color': '#10b981',
            '--warning-color': '#f59e0b',
            '--shadow-color': 'rgba(0,0,0,0.08)',
            '--overlay-bg': 'rgba(0,0,0,0.4)',
            '--input-bg': '#ffffff',
            '--input-border': '#ddd',
            '--link-card-bg': '#f8f9ff',
            '--link-card-border': '#e8ecf8',
            '--link-card-pinned-bg': '#fffbeb',
            '--link-card-pinned-border': '#f59e0b',
            '--task-completed-bg': '#f8f9fa',
            '--chip-bg': '#f0f4ff',
            '--chip-border': '#d0dcff'
        },
        dark: {
            '--bg-primary': '#0f172a',
            '--bg-secondary': '#1e293b',
            '--bg-card': '#1e293b',
            '--text-primary': '#f1f5f9',
            '--text-secondary': '#cbd5e1',
            '--text-muted': '#94a3b8',
            '--border-color': '#334155',
            '--primary-color': '#60a5fa',
            '--primary-hover': '#3b82f6',
            '--danger-color': '#f87171',
            '--danger-hover': '#ef4444',
            '--success-color': '#34d399',
            '--warning-color': '#fbbf24',
            '--shadow-color': 'rgba(0,0,0,0.3)',
            '--overlay-bg': 'rgba(0,0,0,0.7)',
            '--input-bg': '#334155',
            '--input-border': '#475569',
            '--link-card-bg': '#1e293b',
            '--link-card-border': '#334155',
            '--link-card-pinned-bg': '#451a03',
            '--link-card-pinned-border': '#d97706',
            '--task-completed-bg': '#1e293b',
            '--chip-bg': '#1e3a8a',
            '--chip-border': '#3b82f6'
        }
    };

    /**
     * 应用主题 CSS 变量
     * @private
     * @param {string} themeName - 主题名称
     */
    function applyTheme(themeName) {
        const theme = themes[themeName];
        if (!theme) return;

        const root = document.documentElement;
        Object.entries(theme).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        // 设置 data-theme 属性
        document.body.setAttribute('data-theme', themeName);
    }

    /**
     * 检测系统主题偏好
     * @private
     * @returns {string} 主题名称
     */
    function detectSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    /**
     * 保存主题设置
     * @private
     */
    function saveTheme() {
        try {
            localStorage.setItem('studyhub_theme', currentTheme);
        } catch (e) {
            console.error('保存主题失败:', e);
        }
    }

    /**
     * 加载保存的主题
     * @private
     */
    function loadTheme() {
        try {
            const saved = localStorage.getItem('studyhub_theme');
            if (saved && themes[saved]) {
                return saved;
            }
        } catch (e) {
            console.error('加载主题失败:', e);
        }
        return detectSystemTheme();
    }

    /**
     * 主题模块公共 API
     */
    return {
        /**
         * 初始化主题系统
         */
        init() {
            currentTheme = loadTheme();
            applyTheme(currentTheme);
            
            // 监听系统主题变化
            if (window.matchMedia) {
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                mediaQuery.addEventListener('change', (e) => {
                    if (currentTheme === 'auto') {
                        applyTheme(e.matches ? 'dark' : 'light');
                    }
                });
            }
        },

        /**
         * 设置主题
         * @param {string} themeName - 主题名称 (light/dark/auto)
         */
        set(themeName) {
            if (!['light', 'dark', 'auto'].includes(themeName)) {
                console.error('无效的主题:', themeName);
                return;
            }

            currentTheme = themeName;
            
            if (themeName === 'auto') {
                applyTheme(detectSystemTheme());
            } else {
                applyTheme(themeName);
            }
            
            saveTheme();
            
            // 通知监听器
            listeners.forEach(callback => {
                try {
                    callback(themeName);
                } catch (e) {
                    console.error('主题变更回调错误:', e);
                }
            });
        },

        /**
         * 获取当前主题
         * @returns {string} 当前主题名称
         */
        get() {
            return currentTheme;
        },

        /**
         * 切换主题
         */
        toggle() {
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            this.set(newTheme);
        },

        /**
         * 订阅主题变更
         * @param {Function} callback - 回调函数
         */
        subscribe(callback) {
            listeners.add(callback);
        },

        /**
         * 取消订阅
         * @param {Function} callback - 回调函数
         */
        unsubscribe(callback) {
            listeners.delete(callback);
        },

        /**
         * 获取可用主题列表
         * @returns {Array} 主题列表
         */
        getAvailableThemes() {
            return [
                { id: 'light', name: '浅色', icon: '☀️' },
                { id: 'dark', name: '深色', icon: '🌙' },
                { id: 'auto', name: '跟随系统', icon: '🔄' }
            ];
        },

        /**
         * 获取主题配置
         * @param {string} themeName - 主题名称
         * @returns {Object} 主题配置
         */
        getThemeConfig(themeName) {
            return themes[themeName] || themes.light;
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Theme;
}
