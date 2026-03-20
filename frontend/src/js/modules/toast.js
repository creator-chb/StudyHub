/**
 * StudyHub Toast 通知模块
 * 统一的消息通知系统
 * @module Toast
 */

const Toast = (function() {
    'use strict';

    /**
     * Toast 容器元素
     * @type {HTMLElement|null}
     */
    let container = null;

    /**
     * 当前显示的 Toast 列表
     * @type {Array}
     */
    const activeToasts = [];

    /**
     * 图标映射
     * @type {Object}
     */
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };

    /**
     * 默认持续时间
     * @type {Object}
     */
    const defaultDurations = {
        success: 2000,
        error: 3000,
        info: 2500,
        warning: 3000
    };

    /**
     * 最大同时显示的 Toast 数量
     * @type {number}
     */
    const maxVisible = 5;

    /**
     * 初始化 Toast 容器
     * @private
     */
    function initContainer() {
        if (!container) {
            container = document.getElementById('toastContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toastContainer';
                container.className = 'toast-container';
                document.body.appendChild(container);
            }
        }
    }

    /**
     * 创建 Toast 元素
     * @private
     * @param {string} message - 消息内容
     * @param {string} type - 类型
     * @returns {HTMLElement} Toast 元素
     */
    function createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${escapeHtml(message)}</span>
            <button class="toast-close" aria-label="关闭">×</button>
        `;
        
        // 绑定关闭事件
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => dismiss(toast));
        
        return toast;
    }

    /**
     * HTML 转义
     * @private
     * @param {string} str - 要转义的字符串
     * @returns {string} 转义后的字符串
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * 移除 Toast
     * @private
     * @param {HTMLElement} toast - Toast 元素
     */
    function dismiss(toast) {
        toast.classList.add('hiding');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
                const index = activeToasts.indexOf(toast);
                if (index > -1) {
                    activeToasts.splice(index, 1);
                }
            }
        }, 300);
    }

    /**
     * 管理 Toast 数量
     * @private
     */
    function manageToastCount() {
        while (activeToasts.length >= maxVisible) {
            const oldest = activeToasts.shift();
            if (oldest && oldest.parentElement) {
                dismiss(oldest);
            }
        }
    }

    /**
     * Toast 模块公共 API
     */
    return {
        /**
         * 显示 Toast 通知
         * @param {string} message - 消息内容
         * @param {string} type - 类型 (success/error/info/warning)
         * @param {number} duration - 持续时间（毫秒）
         * @returns {HTMLElement} Toast 元素
         */
        show(message, type = 'info', duration = null) {
            initContainer();
            
            const actualDuration = duration || defaultDurations[type] || 2500;
            const toast = createToastElement(message, type);
            
            // 管理数量限制
            manageToastCount();
            activeToasts.push(toast);
            
            container.appendChild(toast);
            
            // 自动关闭
            const timeoutId = setTimeout(() => {
                if (toast.parentElement) {
                    dismiss(toast);
                }
            }, actualDuration);
            
            // 保存 timeoutId 以便手动关闭时清除
            toast.dataset.timeoutId = timeoutId;
            
            return toast;
        },

        /**
         * 显示成功消息
         * @param {string} message - 消息内容
         * @param {number} duration - 持续时间
         * @returns {HTMLElement} Toast 元素
         */
        success(message, duration) {
            return this.show(message, 'success', duration);
        },

        /**
         * 显示错误消息
         * @param {string} message - 消息内容
         * @param {number} duration - 持续时间
         * @returns {HTMLElement} Toast 元素
         */
        error(message, duration) {
            return this.show(message, 'error', duration);
        },

        /**
         * 显示信息消息
         * @param {string} message - 消息内容
         * @param {number} duration - 持续时间
         * @returns {HTMLElement} Toast 元素
         */
        info(message, duration) {
            return this.show(message, 'info', duration);
        },

        /**
         * 显示警告消息
         * @param {string} message - 消息内容
         * @param {number} duration - 持续时间
         * @returns {HTMLElement} Toast 元素
         */
        warning(message, duration) {
            return this.show(message, 'warning', duration);
        },

        /**
         * 关闭指定 Toast
         * @param {HTMLElement} toast - Toast 元素
         */
        dismiss(toast) {
            if (toast.dataset.timeoutId) {
                clearTimeout(parseInt(toast.dataset.timeoutId));
            }
            dismiss(toast);
        },

        /**
         * 关闭所有 Toast
         */
        clearAll() {
            [...activeToasts].forEach(toast => dismiss(toast));
            activeToasts.length = 0;
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Toast;
}
