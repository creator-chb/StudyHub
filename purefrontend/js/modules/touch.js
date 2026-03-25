/**
 * StudyHub 触摸操作模块
 * 移动端手势支持
 * @module Touch
 */

const Touch = (function() {
    'use strict';

    let startPos = { x: 0, y: 0 };
    let startTime = 0;
    let currentElement = null;
    const SWIPE_THRESHOLD = 80;
    const MAX_SWIPE_TIME = 300;
    const LONG_PRESS_TIME = 500;
    let longPressTimer = null;
    let longPressTriggered = false;
    const gestureListeners = new Map();

    function handleTouchStart(event) {
        const touch = event.touches[0];
        startPos = { x: touch.clientX, y: touch.clientY };
        startTime = Date.now();
        currentElement = event.currentTarget;
        longPressTriggered = false;

        longPressTimer = setTimeout(() => {
            longPressTriggered = true;
            triggerGesture('longpress', { element: currentElement, originalEvent: event });
        }, LONG_PRESS_TIME);
    }

    function handleTouchMove(event) {
        if (!startPos.x || !startPos.y) return;

        const touch = event.touches[0];
        const diffX = startPos.x - touch.clientX;
        const diffY = startPos.y - touch.clientY;

        if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
            clearTimeout(longPressTimer);
        }

        if (currentElement && currentElement.dataset.swipeable === 'true') {
            if (Math.abs(diffX) > Math.abs(diffY)) {
                event.preventDefault();
                const translateX = Math.max(-diffX, -120);
                currentElement.style.transform = `translateX(${translateX}px)`;
            }
        }
    }

    function handleTouchEnd(event) {
        clearTimeout(longPressTimer);
        if (longPressTriggered) return;

        const touch = event.changedTouches[0];
        const diffX = startPos.x - touch.clientX;
        const diffY = startPos.y - touch.clientY;
        const timeDiff = Date.now() - startTime;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (Math.abs(diffX) > SWIPE_THRESHOLD && timeDiff < MAX_SWIPE_TIME) {
                if (diffX > 0) triggerGesture('swipeleft', { element: currentElement, distance: Math.abs(diffX), originalEvent: event });
                else triggerGesture('swiperight', { element: currentElement, distance: Math.abs(diffX), originalEvent: event });
            }
        }

        if (currentElement && currentElement.dataset.swipeable === 'true') {
            if (Math.abs(diffX) > SWIPE_THRESHOLD / 2) currentElement.classList.add('swipe-open');
            else closeSwipeActions(currentElement);
        }

        startPos = { x: 0, y: 0 };
        currentElement = null;
    }

    function triggerGesture(gesture, data) {
        if (gestureListeners.has(gesture)) {
            gestureListeners.get(gesture).forEach(callback => {
                try { callback(data); } catch (e) { console.error('手势处理器错误:', e); }
            });
        }
    }

    function closeSwipeActions(element) {
        element.style.transform = '';
        element.classList.remove('swipe-open');
        const existingActions = element.parentElement.querySelector('.swipe-actions');
        if (existingActions) existingActions.remove();
    }

    return {
        init() {
            document.addEventListener('click', (e) => {
                const openItems = document.querySelectorAll('.swipe-open');
                openItems.forEach(item => {
                    if (!item.contains(e.target)) closeSwipeActions(item);
                });
            });
        },

        makeSwipeable(element, actions) {
            element.dataset.swipeable = 'true';
            element.addEventListener('touchstart', handleTouchStart, { passive: true });
            element.addEventListener('touchmove', handleTouchMove, { passive: false });
            element.addEventListener('touchend', handleTouchEnd);
            element.dataset.swipeActions = JSON.stringify(actions);

            this.on('swipeleft', (data) => {
                if (data.element === element) {
                    const existingActions = element.parentElement.querySelector('.swipe-actions');
                    if (existingActions) closeSwipeActions(element);
                    else {
                        element.style.transform = 'translateX(-100px)';
                        const container = document.createElement('div');
                        container.className = 'swipe-actions';
                        actions.forEach(action => {
                            const btn = document.createElement('button');
                            btn.className = `swipe-action-btn ${action.className || ''}`;
                            btn.innerHTML = action.icon || action.text;
                            btn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                action.onClick(element);
                                closeSwipeActions(element);
                            });
                            container.appendChild(btn);
                        });
                        element.parentElement.appendChild(container);
                    }
                }
            });
        },

        on(gesture, callback) {
            if (!gestureListeners.has(gesture)) gestureListeners.set(gesture, new Set());
            gestureListeners.get(gesture).add(callback);
        },

        off(gesture, callback) {
            if (gestureListeners.has(gesture)) gestureListeners.get(gesture).delete(callback);
        },

        isTouchDevice() { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; }
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Touch;
}
