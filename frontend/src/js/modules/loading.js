/**
 * StudyHub 加载状态模块
 * 提供全局和局部加载状态管理
 * @module Loading
 */

const Loading = (function() {
    'use strict';

    /**
     * 加载状态计数器
     * 用于处理并发请求
     * @type {number}
     */
    let loadingCount = 0;

    /**
     * 全局加载指示器元素
     * @type {HTMLElement|null}
     */
    let globalLoader = null;

    /**
     * 按钮加载状态映射
     * @type {Map}
     */
    const buttonStates = new Map();

    /**
     * 加载状态变更监听器
     * @type {Set}
     */
    const listeners = new Set();

    // =============================================
    // 全局加载指示器
    // =============================================

    /**
     * 创建全局加载指示器
     * @private
     */
    function createGlobalLoader() {
        if (globalLoader) return;

        globalLoader = document.createElement('div');
        globalLoader.id = 'globalLoading';
        globalLoader.className = 'global-loading hidden';
        globalLoader.innerHTML = `
            <div class="global-loading-backdrop"></div>
            <div class="global-loading-content">
                <div class="loading-spinner large"></div>
                <span class="loading-text">加载中...</span>
            </div>
        `;
        document.body.appendChild(globalLoader);
    }

    /**
     * 显示全局加载指示器
     * @param {string} text - 加载提示文本
     */
    function showGlobal(text = '加载中...') {
        createGlobalLoader();
        
        loadingCount++;
        
        const textEl = globalLoader.querySelector('.loading-text');
        if (textEl) {
            textEl.textContent = text;
        }
        
        globalLoader.classList.remove('hidden');
        
        notifyListeners(true);
    }

    /**
     * 隐藏全局加载指示器
     */
    function hideGlobal() {
        loadingCount = Math.max(0, loadingCount - 1);
        
        if (loadingCount === 0 && globalLoader) {
            globalLoader.classList.add('hidden');
        }
        
        notifyListeners(false);
    }

    /**
     * 强制隐藏全局加载指示器
     */
    function forceHideGlobal() {
        loadingCount = 0;
        
        if (globalLoader) {
            globalLoader.classList.add('hidden');
        }
        
        notifyListeners(false);
    }

    // =============================================
    // 按钮加载状态
    // =============================================

    /**
     * 显示按钮加载状态
     * @param {HTMLElement|string} button - 按钮元素或选择器
     * @param {string} text - 加载文本
     * @returns {string} 加载 ID
     */
    function showButton(button, text = '处理中...') {
        const btn = typeof button === 'string' 
            ? document.querySelector(button) 
            : button;
        
        if (!btn) return '';

        const loadingId = 'loading_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // 保存原始状态
        buttonStates.set(loadingId, {
            element: btn,
            originalText: btn.textContent,
            originalDisabled: btn.disabled,
            originalWidth: btn.style.width || btn.offsetWidth + 'px'
        });

        // 设置加载状态
        btn.disabled = true;
        btn.style.width = buttonStates.get(loadingId).originalWidth;
        btn.innerHTML = `
            <span class="btn-loading-content">
                <span class="loading-spinner small"></span>
                <span>${text}</span>
            </span>
        `;
        btn.classList.add('btn-loading');

        return loadingId;
    }

    /**
     * 隐藏按钮加载状态
     * @param {string} loadingId - 加载 ID
     */
    function hideButton(loadingId) {
        const state = buttonStates.get(loadingId);
        if (!state) return;

        const { element, originalText, originalDisabled } = state;
        
        element.disabled = originalDisabled;
        element.textContent = originalText;
        element.classList.remove('btn-loading');
        element.style.width = '';
        
        buttonStates.delete(loadingId);
    }

    /**
     * 隐藏所有按钮加载状态
     */
    function hideAllButtons() {
        buttonStates.forEach((state, loadingId) => {
            hideButton(loadingId);
        });
    }

    // =============================================
    // 内联加载指示器
    // =============================================

    /**
     * 在元素内显示加载状态
     * @param {HTMLElement|string} container - 容器元素或选择器
     * @param {string} text - 加载文本
     */
    function showInline(container, text = '加载中...') {
        const el = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!el) return;

        el.innerHTML = `
            <div class="loading-inline">
                <div class="loading-spinner"></div>
                <span class="loading-text">${text}</span>
            </div>
        `;
    }

    /**
     * 创建内联 Spinner HTML
     * @param {string} size - 尺寸 (small/medium/large)
     * @returns {string} HTML 字符串
     */
    function createSpinner(size = 'medium') {
        return `<div class="loading-spinner ${size}"></div>`;
    }

    // =============================================
    // 状态查询
    // =============================================

    /**
     * 检查是否正在加载
     * @returns {boolean}
     */
    function isLoading() {
        return loadingCount > 0;
    }

    /**
     * 获取当前加载计数
     * @returns {number}
     */
    function getLoadingCount() {
        return loadingCount;
    }

    // =============================================
    // 事件订阅
    // =============================================

    /**
     * 通知状态变更
     * @private
     * @param {boolean} isLoading - 是否正在加载
     */
    function notifyListeners(isLoading) {
        listeners.forEach(callback => {
            try {
                callback(isLoading, loadingCount);
            } catch (e) {
                console.error('[Loading] 监听器错误:', e);
            }
        });
    }

    /**
     * 订阅加载状态变更
     * @param {Function} callback - 回调函数
     */
    function subscribe(callback) {
        listeners.add(callback);
    }

    /**
     * 取消订阅
     * @param {Function} callback - 回调函数
     */
    function unsubscribe(callback) {
        listeners.delete(callback);
    }

    // =============================================
    // 公开 API
    // =============================================

    return {
        // 全局加载
        showGlobal,
        hideGlobal,
        forceHideGlobal,
        
        // 按钮加载
        showButton,
        hideButton,
        hideAllButtons,
        
        // 内联加载
        showInline,
        createSpinner,
        
        // 状态查询
        isLoading,
        getLoadingCount,
        
        // 事件订阅
        subscribe,
        unsubscribe,
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Loading;
}
