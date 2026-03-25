/**
 * StudyHub Toast 通知模块
 * 统一的消息通知系统
 * @module Toast
 */

const Toast = (function() {
    'use strict';

    let container = null;
    const activeToasts = [];
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const defaultDurations = { success: 2000, error: 3000, info: 2500, warning: 3000 };
    const maxVisible = 5;

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

    function createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${escapeHtml(message)}</span>
            <button class="toast-close" aria-label="关闭">×</button>
        `;
        
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => dismiss(toast));
        
        return toast;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function dismiss(toast) {
        toast.classList.add('hiding');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
                const index = activeToasts.indexOf(toast);
                if (index > -1) activeToasts.splice(index, 1);
            }
        }, 300);
    }

    function manageToastCount() {
        while (activeToasts.length >= maxVisible) {
            const oldest = activeToasts.shift();
            if (oldest && oldest.parentElement) dismiss(oldest);
        }
    }

    return {
        show(message, type = 'info', duration = null) {
            initContainer();
            
            const actualDuration = duration || defaultDurations[type] || 2500;
            const toast = createToastElement(message, type);
            
            manageToastCount();
            activeToasts.push(toast);
            container.appendChild(toast);
            
            const timeoutId = setTimeout(() => {
                if (toast.parentElement) dismiss(toast);
            }, actualDuration);
            
            toast.dataset.timeoutId = timeoutId;
            return toast;
        },

        success(message, duration) { return this.show(message, 'success', duration); },
        error(message, duration) { return this.show(message, 'error', duration); },
        info(message, duration) { return this.show(message, 'info', duration); },
        warning(message, duration) { return this.show(message, 'warning', duration); },

        dismiss(toast) {
            if (toast.dataset.timeoutId) clearTimeout(parseInt(toast.dataset.timeoutId));
            dismiss(toast);
        },

        clearAll() {
            [...activeToasts].forEach(toast => dismiss(toast));
            activeToasts.length = 0;
        }
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Toast;
}
