/**
 * StudyHub 键盘快捷键模块
 * 统一的键盘事件管理
 * @module Keyboard
 */

const Keyboard = (function() {
    'use strict';

    /**
     * 快捷键映射
     * @type {Map}
     */
    const shortcuts = new Map();

    /**
     * 当前聚焦的元素类型
     * @type {string|null}
     */
    let currentFocusType = null;

    /**
     * 当前聚焦索引
     * @type {number}
     */
    let currentFocusIndex = -1;

    /**
     * 是否启用快捷键
     * @type {boolean}
     */
    let enabled = true;

    /**
     * 输入元素标签名
     * @type {Array}
     */
    const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];

    /**
     * 检查元素是否为输入元素
     * @private
     * @param {HTMLElement} element - 要检查的元素
     * @returns {boolean}
     */
    function isInputElement(element) {
        return inputTags.includes(element.tagName) || element.isContentEditable;
    }

    /**
     * 检查是否有模态框打开
     * @private
     * @returns {boolean}
     */
    function hasOpenModal() {
        return document.querySelector('.modal-overlay.active') !== null;
    }

    /**
     * 生成快捷键键名
     * @private
     * @param {Object} keyData - 按键数据
     * @returns {string} 键名
     */
    function getShortcutKey(keyData) {
        const parts = [];
        if (keyData.ctrl) parts.push('ctrl');
        if (keyData.alt) parts.push('alt');
        if (keyData.shift) parts.push('shift');
        parts.push(keyData.key.toLowerCase());
        return parts.join('+');
    }

    /**
     * 处理键盘事件
     * @private
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleKeyDown(event) {
        if (!enabled) return;

        // 如果在输入元素中，只处理特定快捷键
        if (isInputElement(event.target)) {
            // ESC 关闭模态框
            if (event.key === 'Escape') {
                const modal = document.querySelector('.modal-overlay.active');
                if (modal) {
                    modal.classList.remove('active');
                }
            }
            return;
        }

        // 生成快捷键键名
        const shortcutKey = getShortcutKey({
            key: event.key,
            ctrl: event.ctrlKey,
            alt: event.altKey,
            shift: event.shiftKey
        });

        // 查找并执行快捷键
        if (shortcuts.has(shortcutKey)) {
            const handler = shortcuts.get(shortcutKey);
            if (!handler.modalOnly || hasOpenModal()) {
                event.preventDefault();
                handler.callback(event);
            }
        }

        // 列表导航
        handleListNavigation(event);
    }

    /**
     * 处理列表导航
     * @private
     * @param {KeyboardEvent} event - 键盘事件
     */
    function handleListNavigation(event) {
        if (hasOpenModal()) return;

        const linkCards = document.querySelectorAll('.link-card');
        const tasks = document.querySelectorAll('#taskList > .task, .completed-section .task');

        switch (event.key) {
            case 'ArrowDown':
                if (currentFocusType && navigateList(1)) {
                    event.preventDefault();
                }
                break;
            case 'ArrowUp':
                if (currentFocusType && navigateList(-1)) {
                    event.preventDefault();
                }
                break;
            case 'Enter':
                if (currentFocusType) {
                    activateCurrentItem();
                    event.preventDefault();
                }
                break;
            case 'Delete':
                if (currentFocusType) {
                    deleteCurrentItem();
                    event.preventDefault();
                }
                break;
        }
    }

    /**
     * 在列表中导航
     * @private
     * @param {number} direction - 方向 (1 或 -1)
     * @returns {boolean} 是否成功导航
     */
    function navigateList(direction) {
        const items = currentFocusType === 'link' 
            ? document.querySelectorAll('.link-card')
            : document.querySelectorAll('#taskList > .task, .completed-section .task');

        if (items.length === 0) return false;

        currentFocusIndex += direction;
        
        // 边界检查
        if (currentFocusIndex < 0) currentFocusIndex = 0;
        if (currentFocusIndex >= items.length) currentFocusIndex = items.length - 1;

        // 聚焦并滚动到视图
        const item = items[currentFocusIndex];
        if (item) {
            item.focus();
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            item.classList.add('keyboard-focused');
            
            // 移除其他项的高亮
            items.forEach((el, idx) => {
                if (idx !== currentFocusIndex) {
                    el.classList.remove('keyboard-focused');
                }
            });
        }

        return true;
    }

    /**
     * 激活当前项
     * @private
     */
    function activateCurrentItem() {
        const items = currentFocusType === 'link'
            ? document.querySelectorAll('.link-card')
            : document.querySelectorAll('#taskList > .task, .completed-section .task');

        const item = items[currentFocusIndex];
        if (!item) return;

        if (currentFocusType === 'link') {
            // 打开链接
            const linkName = item.querySelector('.link-card-name');
            if (linkName) {
                linkName.click();
            }
        } else {
            // 任务一键跳转
            const openBtn = item.querySelector('button[title="一键跳转"]');
            if (openBtn) {
                openBtn.click();
            }
        }
    }

    /**
     * 删除当前项
     * @private
     */
    function deleteCurrentItem() {
        const items = currentFocusType === 'link'
            ? document.querySelectorAll('.link-card')
            : document.querySelectorAll('#taskList > .task, .completed-section .task');

        const item = items[currentFocusIndex];
        if (!item) return;

        const deleteBtn = item.querySelector('.btn-danger');
        if (deleteBtn) {
            deleteBtn.click();
        }
    }

    /**
     * 键盘模块公共 API
     */
    return {
        /**
         * 初始化键盘模块
         */
        init() {
            document.addEventListener('keydown', handleKeyDown);
            
            // 监听列表项聚焦
            document.addEventListener('focusin', (e) => {
                const target = e.target;
                if (target.classList.contains('link-card')) {
                    currentFocusType = 'link';
                    const items = document.querySelectorAll('.link-card');
                    currentFocusIndex = Array.from(items).indexOf(target);
                } else if (target.classList.contains('task')) {
                    currentFocusType = 'task';
                    const items = document.querySelectorAll('#taskList > .task, .completed-section .task');
                    currentFocusIndex = Array.from(items).indexOf(target);
                }
            });
        },

        /**
         * 注册快捷键
         * @param {string} key - 按键（如 'n', 'ctrl+s'）
         * @param {Function} callback - 回调函数
         * @param {Object} options - 选项
         * @param {boolean} options.modalOnly - 仅在模态框打开时生效
         */
        register(key, callback, options = {}) {
            const parts = key.toLowerCase().split('+');
            const keyData = {
                key: parts.filter(p => !['ctrl', 'alt', 'shift'].includes(p)).join('+'),
                ctrl: parts.includes('ctrl'),
                alt: parts.includes('alt'),
                shift: parts.includes('shift'),
                callback,
                modalOnly: options.modalOnly || false
            };

            shortcuts.set(getShortcutKey(keyData), keyData);
        },

        /**
         * 注销快捷键
         * @param {string} key - 按键
         */
        unregister(key) {
            const parts = key.toLowerCase().split('+');
            const keyData = {
                key: parts.filter(p => !['ctrl', 'alt', 'shift'].includes(p)).join('+'),
                ctrl: parts.includes('ctrl'),
                alt: parts.includes('alt'),
                shift: parts.includes('shift')
            };
            shortcuts.delete(getShortcutKey(keyData));
        },

        /**
         * 启用快捷键
         */
        enable() {
            enabled = true;
        },

        /**
         * 禁用快捷键
         */
        disable() {
            enabled = false;
        },

        /**
         * 获取所有已注册的快捷键
         * @returns {Array} 快捷键列表
         */
        getAllShortcuts() {
            return Array.from(shortcuts.entries()).map(([key, data]) => ({
                key,
                description: data.description || key
            }));
        },

        /**
         * 设置当前聚焦类型
         * @param {string|null} type - 类型 ('link' 或 'task')
         */
        setFocusType(type) {
            currentFocusType = type;
            currentFocusIndex = -1;
        },

        /**
         * 获取当前聚焦信息
         * @returns {Object} 聚焦信息
         */
        getFocusInfo() {
            return {
                type: currentFocusType,
                index: currentFocusIndex
            };
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Keyboard;
}
