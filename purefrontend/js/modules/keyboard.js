/**
 * StudyHub 键盘快捷键模块
 * 统一的键盘事件管理
 * @module Keyboard
 */

const Keyboard = (function() {
    'use strict';

    const shortcuts = new Map();
    let currentFocusType = null;
    let currentFocusIndex = -1;
    let enabled = true;
    const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];

    function isInputElement(element) {
        return inputTags.includes(element.tagName) || element.isContentEditable;
    }

    function hasOpenModal() {
        return document.querySelector('.modal-overlay.active') !== null;
    }

    function getShortcutKey(keyData) {
        const parts = [];
        if (keyData.ctrl) parts.push('ctrl');
        if (keyData.alt) parts.push('alt');
        if (keyData.shift) parts.push('shift');
        parts.push(keyData.key.toLowerCase());
        return parts.join('+');
    }

    function handleKeyDown(event) {
        if (!enabled) return;

        if (isInputElement(event.target)) {
            if (event.key === 'Escape') {
                const modal = document.querySelector('.modal-overlay.active');
                if (modal) modal.classList.remove('active');
            }
            return;
        }

        const shortcutKey = getShortcutKey({
            key: event.key,
            ctrl: event.ctrlKey,
            alt: event.altKey,
            shift: event.shiftKey
        });

        if (shortcuts.has(shortcutKey)) {
            const handler = shortcuts.get(shortcutKey);
            if (!handler.modalOnly || hasOpenModal()) {
                event.preventDefault();
                handler.callback(event);
            }
        }

        handleListNavigation(event);
    }

    function handleListNavigation(event) {
        if (hasOpenModal()) return;

        switch (event.key) {
            case 'ArrowDown':
                if (currentFocusType && navigateList(1)) event.preventDefault();
                break;
            case 'ArrowUp':
                if (currentFocusType && navigateList(-1)) event.preventDefault();
                break;
            case 'Enter':
                if (currentFocusType) { activateCurrentItem(); event.preventDefault(); }
                break;
        }
    }

    function navigateList(direction) {
        const items = currentFocusType === 'link' 
            ? document.querySelectorAll('.link-card')
            : document.querySelectorAll('#taskList > .task, .completed-section .task');

        if (items.length === 0) return false;

        currentFocusIndex += direction;
        if (currentFocusIndex < 0) currentFocusIndex = 0;
        if (currentFocusIndex >= items.length) currentFocusIndex = items.length - 1;

        const item = items[currentFocusIndex];
        if (item) {
            item.focus();
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            item.classList.add('keyboard-focused');
            items.forEach((el, idx) => {
                if (idx !== currentFocusIndex) el.classList.remove('keyboard-focused');
            });
        }
        return true;
    }

    function activateCurrentItem() {
        const items = currentFocusType === 'link'
            ? document.querySelectorAll('.link-card')
            : document.querySelectorAll('#taskList > .task, .completed-section .task');

        const item = items[currentFocusIndex];
        if (!item) return;

        if (currentFocusType === 'link') {
            const linkName = item.querySelector('.link-card-name');
            if (linkName) linkName.click();
        } else {
            const openBtn = item.querySelector('.btn-open-links');
            if (openBtn) openBtn.click();
        }
    }

    return {
        init() {
            document.addEventListener('keydown', handleKeyDown);
            
            document.addEventListener('focusin', (e) => {
                const target = e.target;
                if (target.classList.contains('link-card')) {
                    currentFocusType = 'link';
                    currentFocusIndex = Array.from(document.querySelectorAll('.link-card')).indexOf(target);
                } else if (target.classList.contains('task')) {
                    currentFocusType = 'task';
                    currentFocusIndex = Array.from(document.querySelectorAll('#taskList > .task, .completed-section .task')).indexOf(target);
                }
            });
        },

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

        enable() { enabled = true; },
        disable() { enabled = false; },

        setFocusType(type) { currentFocusType = type; currentFocusIndex = -1; },
        getFocusInfo() { return { type: currentFocusType, index: currentFocusIndex }; }
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Keyboard;
}
