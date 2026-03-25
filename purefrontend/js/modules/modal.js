/**
 * StudyHub 模态框模块
 * 统一的对话框管理系统
 * @module Modal
 */

const Modal = (function() {
    'use strict';

    const modalStack = [];
    let confirmResolver = null;

    function createOverlay(id) {
        const overlay = document.createElement('div');
        overlay.id = id;
        overlay.className = 'modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        return overlay;
    }

    function createModalBox(options) {
        const box = document.createElement('div');
        box.className = 'modal-box';
        
        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = options.title || '';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        if (options.content) content.innerHTML = options.content;
        
        box.appendChild(title);
        box.appendChild(content);
        
        if (options.buttons && options.buttons.length > 0) {
            const footer = document.createElement('div');
            footer.className = 'modal-footer';
            
            options.buttons.forEach(btn => {
                const button = document.createElement('button');
                button.textContent = btn.text;
                button.className = btn.className || '';
                if (btn.primary) button.classList.add('btn-primary');
                button.addEventListener('click', () => {
                    if (btn.onClick) btn.onClick();
                    if (btn.close !== false) Modal.close(options.id);
                });
                footer.appendChild(button);
            });
            
            box.appendChild(footer);
        }
        
        return box;
    }

    return {
        open(options) {
            const id = options.id || 'modal-' + Date.now();
            
            const existing = document.getElementById(id);
            if (existing) this.close(id);
            
            const overlay = createOverlay(id);
            const box = createModalBox({ ...options, id });
            overlay.appendChild(box);
            
            if (options.closeOnOverlay !== false) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) this.close(id);
                });
            }
            
            document.body.appendChild(overlay);
            
            requestAnimationFrame(() => overlay.classList.add('active'));
            
            const firstInput = overlay.querySelector('input, textarea, select');
            if (firstInput) setTimeout(() => firstInput.focus(), 50);
            
            modalStack.push({ id, element: overlay, options });
            return overlay;
        },

        close(id) {
            const index = modalStack.findIndex(m => m.id === id);
            if (index === -1) return;
            
            const { element } = modalStack[index];
            element.classList.remove('active');
            
            setTimeout(() => {
                if (element.parentElement) element.parentElement.removeChild(element);
            }, 200);
            
            modalStack.splice(index, 1);
        },

        closeAll() {
            [...modalStack].forEach(({ id }) => this.close(id));
        },

        confirm(options = {}) {
            return new Promise((resolve) => {
                confirmResolver = resolve;
                
                const id = 'confirm-modal-' + Date.now();
                const content = `
                    <div class="confirm-modal-content">
                        <div class="confirm-icon">${options.icon || '⚠️'}</div>
                        <div class="confirm-message">${options.message || '确定要执行此操作吗？'}</div>
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
                                resolve({ confirmed: false });
                                confirmResolver = null;
                            }
                        },
                        {
                            text: options.confirmText || '确认',
                            className: options.isDanger ? 'btn-danger' : '',
                            primary: true,
                            onClick: () => {
                                resolve({ confirmed: true });
                                confirmResolver = null;
                            }
                        }
                    ]
                });
            });
        },

        alert(options = {}) {
            return new Promise((resolve) => {
                const id = 'alert-modal-' + Date.now();
                
                this.open({
                    id,
                    title: options.title || '提示',
                    content: `<div class="alert-message">${options.message || ''}</div>`,
                    buttons: [
                        { text: options.buttonText || '确定', primary: true, onClick: () => resolve() }
                    ]
                });
            });
        },

        getOpenModals() { return [...modalStack]; },

        initEscListener() {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modalStack.length > 0) {
                    const topModal = modalStack[modalStack.length - 1];
                    if (topModal.options.closeOnEsc !== false) this.close(topModal.id);
                }
            });
        }
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Modal;
}
