/**
 * StudyHub 模态框模块
 * 统一的对话框管理系统
 * @module Modal
 */

const Modal = (function() {
    'use strict';

    /**
     * 当前打开的模态框栈
     * @type {Array}
     */
    const modalStack = [];

    /**
     * 确认对话框 Promise 解析器
     * @type {Function|null}
     */
    let confirmResolver = null;

    /**
     * 创建模态框遮罩
     * @private
     * @param {string} id - 模态框 ID
     * @returns {HTMLElement} 遮罩元素
     */
    function createOverlay(id) {
        const overlay = document.createElement('div');
        overlay.id = id;
        overlay.className = 'modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        return overlay;
    }

    /**
     * 创建模态框内容
     * @private
     * @param {Object} options - 配置选项
     * @returns {HTMLElement} 内容元素
     */
    function createModalBox(options) {
        const box = document.createElement('div');
        box.className = 'modal-box';
        
        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = options.title || '';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        if (options.content) {
            content.innerHTML = options.content;
        }
        
        box.appendChild(title);
        box.appendChild(content);
        
        // 添加按钮
        if (options.buttons && options.buttons.length > 0) {
            const footer = document.createElement('div');
            footer.className = 'modal-footer';
            
            options.buttons.forEach(btn => {
                const button = document.createElement('button');
                button.textContent = btn.text;
                button.className = btn.className || '';
                if (btn.primary) {
                    button.classList.add('btn-primary');
                }
                button.addEventListener('click', () => {
                    if (btn.onClick) {
                        btn.onClick();
                    }
                    if (btn.close !== false) {
                        this.close(options.id);
                    }
                });
                footer.appendChild(button);
            });
            
            box.appendChild(footer);
        }
        
        return box;
    }

    /**
     * 模态框模块公共 API
     */
    return {
        /**
         * 打开模态框
         * @param {Object} options - 配置选项
         * @param {string} options.id - 模态框 ID
         * @param {string} options.title - 标题
         * @param {string} options.content - 内容 HTML
         * @param {Array} options.buttons - 按钮配置
         * @param {boolean} options.closeOnOverlay - 点击遮罩关闭
         * @param {boolean} options.closeOnEsc - ESC 键关闭
         * @returns {HTMLElement} 模态框元素
         */
        open(options) {
            const id = options.id || 'modal-' + Date.now();
            
            // 如果已存在则先关闭
            const existing = document.getElementById(id);
            if (existing) {
                this.close(id);
            }
            
            const overlay = createOverlay(id);
            const box = createModalBox.call(this, { ...options, id });
            overlay.appendChild(box);
            
            // 点击遮罩关闭
            if (options.closeOnOverlay !== false) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        this.close(id);
                    }
                });
            }
            
            document.body.appendChild(overlay);
            
            // 触发显示动画
            requestAnimationFrame(() => {
                overlay.classList.add('active');
            });
            
            // 聚焦第一个输入框
            const firstInput = overlay.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 50);
            }
            
            modalStack.push({ id, element: overlay, options });
            
            return overlay;
        },

        /**
         * 关闭模态框
         * @param {string} id - 模态框 ID
         */
        close(id) {
            const index = modalStack.findIndex(m => m.id === id);
            if (index === -1) return;
            
            const { element } = modalStack[index];
            element.classList.remove('active');
            
            setTimeout(() => {
                if (element.parentElement) {
                    element.parentElement.removeChild(element);
                }
            }, 200);
            
            modalStack.splice(index, 1);
        },

        /**
         * 关闭所有模态框
         */
        closeAll() {
            [...modalStack].forEach(({ id }) => this.close(id));
        },

        /**
         * 显示确认对话框
         * @param {Object} options - 配置选项
         * @returns {Promise<Object>} 用户选择结果
         */
        confirm(options = {}) {
            return new Promise((resolve) => {
                confirmResolver = resolve;
                
                const id = 'confirm-modal-' + Date.now();
                const content = `
                    <div class="confirm-modal-content">
                        <div class="confirm-icon">${options.icon || '⚠️'}</div>
                        <div class="confirm-message">${options.message || '确定要执行此操作吗？'}</div>
                        ${options.requireInput ? `<input type="text" class="confirm-input" placeholder="${options.inputPlaceholder || '请输入确认文字'}" id="confirm-input-${id}">` : ''}
                    </div>
                `;
                
                this.open({
                    id,
                    title: options.title || '确认操作',
                    content,
                    closeOnOverlay: options.closeOnOverlay !== false,
                    buttons: [
                        {
                            text: options.cancelText || '取消',
                            className: 'btn-secondary',
                            onClick: () => {
                                resolve({ confirmed: false, inputValue: null });
                                confirmResolver = null;
                            }
                        },
                        {
                            text: options.confirmText || '确认',
                            className: options.isDanger ? 'btn-danger' : '',
                            primary: true,
                            onClick: () => {
                                let inputValue = null;
                                if (options.requireInput) {
                                    const input = document.getElementById(`confirm-input-${id}`);
                                    inputValue = input ? input.value.trim() : null;
                                }
                                resolve({ confirmed: true, inputValue });
                                confirmResolver = null;
                            }
                        }
                    ]
                });
            });
        },

        /**
         * 显示提示对话框
         * @param {Object} options - 配置选项
         * @returns {Promise<void>}
         */
        alert(options = {}) {
            return new Promise((resolve) => {
                const id = 'alert-modal-' + Date.now();
                
                this.open({
                    id,
                    title: options.title || '提示',
                    content: `<div class="alert-message">${options.message || ''}</div>`,
                    buttons: [
                        {
                            text: options.buttonText || '确定',
                            primary: true,
                            onClick: () => resolve()
                        }
                    ]
                });
            });
        },

        /**
         * 获取当前打开的模态框
         * @returns {Array} 模态框列表
         */
        getOpenModals() {
            return [...modalStack];
        },

        /**
         * 初始化 ESC 键监听
         */
        initEscListener() {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modalStack.length > 0) {
                    const topModal = modalStack[modalStack.length - 1];
                    if (topModal.options.closeOnEsc !== false) {
                        this.close(topModal.id);
                    }
                }
            });
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Modal;
}
