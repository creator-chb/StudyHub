/**
 * StudyHub 触摸操作模块
 * 移动端手势支持
 * @module Touch
 */

const Touch = (function() {
    'use strict';

    /**
     * 触摸起始位置
     * @type {Object}
     */
    let startPos = { x: 0, y: 0 };

    /**
     * 触摸起始时间
     * @type {number}
     */
    let startTime = 0;

    /**
     * 当前触摸的元素
     * @type {HTMLElement|null}
     */
    let currentElement = null;

    /**
     * 滑动阈值（像素）
     * @type {number}
     */
    const SWIPE_THRESHOLD = 80;

    /**
     * 最大滑动时间（毫秒）
     * @type {number}
     */
    const MAX_SWIPE_TIME = 300;

    /**
     * 长按时间（毫秒）
     * @type {number}
     */
    const LONG_PRESS_TIME = 500;

    /**
     * 长按定时器
     * @type {number|null}
     */
    let longPressTimer = null;

    /**
     * 是否已触发长按
     * @type {boolean}
     */
    let longPressTriggered = false;

    /**
     * 手势监听器
     * @type {Map}
     */
    const gestureListeners = new Map();

    /**
     * 创建滑动操作按钮
     * @private
     * @param {HTMLElement} element - 目标元素
     * @param {Array} actions - 操作按钮配置
     * @returns {HTMLElement} 操作容器
     */
    function createSwipeActions(element, actions) {
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

        return container;
    }

    /**
     * 关闭滑动操作
     * @private
     * @param {HTMLElement} element - 目标元素
     */
    function closeSwipeActions(element) {
        element.style.transform = '';
        element.classList.remove('swipe-open');
        
        const existingActions = element.parentElement.querySelector('.swipe-actions');
        if (existingActions) {
            existingActions.remove();
        }
    }

    /**
     * 处理触摸开始
     * @private
     * @param {TouchEvent} event - 触摸事件
     */
    function handleTouchStart(event) {
        const touch = event.touches[0];
        startPos = { x: touch.clientX, y: touch.clientY };
        startTime = Date.now();
        currentElement = event.currentTarget;
        longPressTriggered = false;

        // 长按检测
        longPressTimer = setTimeout(() => {
            longPressTriggered = true;
            triggerGesture('longpress', {
                element: currentElement,
                originalEvent: event
            });
        }, LONG_PRESS_TIME);
    }

    /**
     * 处理触摸移动
     * @private
     * @param {TouchEvent} event - 触摸事件
     */
    function handleTouchMove(event) {
        if (!startPos.x || !startPos.y) return;

        const touch = event.touches[0];
        const diffX = startPos.x - touch.clientX;
        const diffY = startPos.y - touch.clientY;

        // 如果移动距离超过阈值，取消长按
        if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
            clearTimeout(longPressTimer);
        }

        // 处理滑动
        if (currentElement && currentElement.dataset.swipeable === 'true') {
            // 水平滑动
            if (Math.abs(diffX) > Math.abs(diffY)) {
                event.preventDefault();
                const translateX = Math.max(-diffX, -120);
                currentElement.style.transform = `translateX(${translateX}px)`;
            }
        }
    }

    /**
     * 处理触摸结束
     * @private
     * @param {TouchEvent} event - 触摸事件
     */
    function handleTouchEnd(event) {
        clearTimeout(longPressTimer);

        if (longPressTriggered) return;

        const touch = event.changedTouches[0];
        const diffX = startPos.x - touch.clientX;
        const diffY = startPos.y - touch.clientY;
        const timeDiff = Date.now() - startTime;

        // 检测滑动手势
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (Math.abs(diffX) > SWIPE_THRESHOLD && timeDiff < MAX_SWIPE_TIME) {
                if (diffX > 0) {
                    triggerGesture('swipeleft', {
                        element: currentElement,
                        distance: Math.abs(diffX),
                        originalEvent: event
                    });
                } else {
                    triggerGesture('swiperight', {
                        element: currentElement,
                        distance: Math.abs(diffX),
                        originalEvent: event
                    });
                }
            }
        } else {
            if (Math.abs(diffY) > SWIPE_THRESHOLD && timeDiff < MAX_SWIPE_TIME) {
                if (diffY > 0) {
                    triggerGesture('swipeup', {
                        element: currentElement,
                        distance: Math.abs(diffY),
                        originalEvent: event
                    });
                } else {
                    triggerGesture('swipedown', {
                        element: currentElement,
                        distance: Math.abs(diffY),
                        originalEvent: event
                    });
                }
            }
        }

        // 重置元素位置
        if (currentElement && currentElement.dataset.swipeable === 'true') {
            if (Math.abs(diffX) > SWIPE_THRESHOLD / 2) {
                // 保持打开状态
                currentElement.classList.add('swipe-open');
            } else {
                // 关闭
                closeSwipeActions(currentElement);
            }
        }

        // 重置状态
        startPos = { x: 0, y: 0 };
        currentElement = null;
    }

    /**
     * 触发手势事件
     * @private
     * @param {string} gesture - 手势类型
     * @param {Object} data - 手势数据
     */
    function triggerGesture(gesture, data) {
        if (gestureListeners.has(gesture)) {
            gestureListeners.get(gesture).forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error('手势处理器错误:', e);
                }
            });
        }
    }

    /**
     * 触摸模块公共 API
     */
    return {
        /**
         * 初始化触摸模块
         */
        init() {
            // 点击外部关闭滑动操作
            document.addEventListener('click', (e) => {
                const openItems = document.querySelectorAll('.swipe-open');
                openItems.forEach(item => {
                    if (!item.contains(e.target)) {
                        closeSwipeActions(item);
                    }
                });
            });
        },

        /**
         * 使元素可滑动
         * @param {HTMLElement} element - 目标元素
         * @param {Array} actions - 滑动操作按钮配置
         */
        makeSwipeable(element, actions) {
            element.dataset.swipeable = 'true';
            
            element.addEventListener('touchstart', handleTouchStart, { passive: true });
            element.addEventListener('touchmove', handleTouchMove, { passive: false });
            element.addEventListener('touchend', handleTouchEnd);

            // 存储操作配置
            element.dataset.swipeActions = JSON.stringify(actions);

            // 监听左滑事件
            this.on('swipeleft', (data) => {
                if (data.element === element) {
                    // 显示操作按钮
                    const existingActions = element.parentElement.querySelector('.swipe-actions');
                    if (existingActions) {
                        closeSwipeActions(element);
                    } else {
                        element.style.transform = 'translateX(-100px)';
                        const actionsContainer = createSwipeActions(element, actions);
                        element.parentElement.appendChild(actionsContainer);
                    }
                }
            });
        },

        /**
         * 移除元素滑动能力
         * @param {HTMLElement} element - 目标元素
         */
        removeSwipeable(element) {
            element.dataset.swipeable = 'false';
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        },

        /**
         * 监听手势
         * @param {string} gesture - 手势类型 (swipeleft/swiperight/swipeup/swipedown/longpress)
         * @param {Function} callback - 回调函数
         */
        on(gesture, callback) {
            if (!gestureListeners.has(gesture)) {
                gestureListeners.set(gesture, new Set());
            }
            gestureListeners.get(gesture).add(callback);
        },

        /**
         * 取消监听手势
         * @param {string} gesture - 手势类型
         * @param {Function} callback - 回调函数
         */
        off(gesture, callback) {
            if (gestureListeners.has(gesture)) {
                gestureListeners.get(gesture).delete(callback);
            }
        },

        /**
         * 检测是否为触摸设备
         * @returns {boolean}
         */
        isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Touch;
}
