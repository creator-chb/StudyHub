/**
 * StudyHub 主题管理模块
 * 支持深色/浅色模式切换
 * @module Theme
 */

const Theme = (function() {
    'use strict';

    let currentTheme = 'light';
    const listeners = new Set();

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

    function applyTheme(themeName) {
        const theme = themes[themeName];
        if (!theme) return;

        const root = document.documentElement;
        Object.entries(theme).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        document.body.setAttribute('data-theme', themeName);
    }

    function detectSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    function saveTheme() {
        try {
            localStorage.setItem('studyhub_theme', currentTheme);
        } catch (e) {
            console.error('保存主题失败:', e);
        }
    }

    function loadTheme() {
        try {
            const saved = localStorage.getItem('studyhub_theme');
            if (saved && themes[saved]) return saved;
        } catch (e) {
            console.error('加载主题失败:', e);
        }
        return detectSystemTheme();
    }

    return {
        init() {
            currentTheme = loadTheme();
            applyTheme(currentTheme);
            
            if (window.matchMedia) {
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                mediaQuery.addEventListener('change', (e) => {
                    if (currentTheme === 'auto') applyTheme(e.matches ? 'dark' : 'light');
                });
            }
        },

        set(themeName) {
            if (!['light', 'dark', 'auto'].includes(themeName)) return;
            currentTheme = themeName;
            if (themeName === 'auto') applyTheme(detectSystemTheme());
            else applyTheme(themeName);
            saveTheme();
            listeners.forEach(callback => { try { callback(themeName); } catch (e) {} });
        },

        get() { return currentTheme; },

        toggle() {
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            this.set(newTheme);
        },

        subscribe(callback) { listeners.add(callback); },
        unsubscribe(callback) { listeners.delete(callback); },

        getAvailableThemes() {
            return [
                { id: 'light', name: '浅色', icon: '☀️' },
                { id: 'dark', name: '深色', icon: '🌙' },
                { id: 'auto', name: '跟随系统', icon: '🔄' }
            ];
        },

        getThemeConfig(themeName) { return themes[themeName] || themes.light; }
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Theme;
}
