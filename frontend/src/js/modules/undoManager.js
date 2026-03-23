/**
 * StudyHub 撤销管理模块
 * 提供操作撤销功能
 * @module UndoManager
 */

const UndoManager = (function() {
    'use strict';

    /**
     * 最大撤销历史数量
     * @type {number}
     */
    const MAX_HISTORY = 10;

    /**
     * 撤销历史队列
     * @type {Array}
     */
    let undoStack = [];

    /**
     * 操作类型定义
     * @type {Object}
     */
    const ActionTypes = {
        LINK_ADD: 'LINK_ADD',
        LINK_DELETE: 'LINK_DELETE',
        LINK_UPDATE: 'LINK_UPDATE',
        LINK_PIN: 'LINK_PIN',
        TASK_ADD: 'TASK_ADD',
        TASK_DELETE: 'TASK_DELETE',
        TASK_UPDATE: 'TASK_UPDATE',
        TASK_COMPLETE: 'TASK_COMPLETE',
        CATEGORY_DELETE: 'CATEGORY_DELETE'
    };

    /**
     * 当前显示的撤销 Toast
     * @type {HTMLElement|null}
     */
    let currentToast = null;

    /**
     * 撤销超时定时器
     * @type {number|null}
     */
    let undoTimeout = null;

    /**
     * 撤销超时时间（毫秒）
     * @type {number}
     */
    const UNDO_TIMEOUT = 5000;

    // =============================================
    // 核心方法
    // =============================================

    /**
     * 记录操作到撤销栈
     * @param {Object} action - 操作对象
     * @param {string} action.type - 操作类型
     * @param {string} action.description - 操作描述
     * @param {Object} action.data - 操作数据
     * @param {Function} action.undo - 撤销函数
     * @param {Function} action.redo - 重做函数（可选）
     * @returns {boolean} 是否成功记录
     */
    function record(action) {
        if (!action || !action.undo) {
            console.warn('[UndoManager] 无效的操作对象');
            return false;
        }

        const actionRecord = {
            id: 'action_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: action.type,
            description: action.description || '操作',
            data: action.data,
            undo: action.undo,
            redo: action.redo,
            timestamp: Date.now()
        };

        // 添加到栈顶
        undoStack.unshift(actionRecord);

        // 限制栈大小
        if (undoStack.length > MAX_HISTORY) {
            undoStack.pop();
        }

        // 显示撤销提示
        showUndoToast(actionRecord);

        return true;
    }

    /**
     * 执行撤销操作
     * @returns {Promise<boolean>} 是否成功撤销
     */
    async function undo() {
        if (undoStack.length === 0) {
            return false;
        }

        // 清除超时定时器
        if (undoTimeout) {
            clearTimeout(undoTimeout);
            undoTimeout = null;
        }

        // 隐藏当前 Toast
        if (currentToast) {
            Toast.dismiss(currentToast);
            currentToast = null;
        }

        const action = undoStack.shift();

        try {
            // 执行撤销
            await action.undo();

            if (typeof Toast !== 'undefined') {
                Toast.show(`已撤销: ${action.description}`, 'success');
            }

            return true;
        } catch (error) {
            console.error('[UndoManager] 撤销失败:', error);
            
            // 撤销失败，将操作放回栈顶
            undoStack.unshift(action);
            
            if (typeof Toast !== 'undefined') {
                Toast.show('撤销失败', 'error');
            }
            
            return false;
        }
    }

    /**
     * 清除撤销历史
     */
    function clear() {
        undoStack = [];
        
        if (undoTimeout) {
            clearTimeout(undoTimeout);
            undoTimeout = null;
        }
        
        if (currentToast) {
            Toast.dismiss(currentToast);
            currentToast = null;
        }
    }

    // =============================================
    // Toast 显示
    // =============================================

    /**
     * 显示撤销 Toast
     * @private
     * @param {Object} action - 操作对象
     */
    function showUndoToast(action) {
        // 清除之前的 Toast 和定时器
        if (undoTimeout) {
            clearTimeout(undoTimeout);
        }
        if (currentToast) {
            Toast.dismiss(currentToast);
        }

        // 创建自定义 Toast
        const toastEl = document.createElement('div');
        toastEl.className = 'toast info undo-toast';
        toastEl.innerHTML = `
            <span class="toast-icon">ℹ</span>
            <span class="toast-message">${escapeHtml(action.description)}</span>
            <button class="toast-undo-btn">撤销</button>
            <button class="toast-close" aria-label="关闭">×</button>
        `;

        // 绑定撤销按钮事件
        const undoBtn = toastEl.querySelector('.toast-undo-btn');
        undoBtn.addEventListener('click', () => {
            undo();
        });

        // 绑定关闭按钮事件
        const closeBtn = toastEl.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            dismissToast();
        });

        // 添加到容器
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        container.appendChild(toastEl);

        currentToast = toastEl;

        // 设置自动消失定时器
        undoTimeout = setTimeout(() => {
            dismissToast();
            // 超时后从撤销栈中移除（用户选择不撤销）
            if (undoStack.length > 0 && undoStack[0].id === action.id) {
                undoStack.shift();
            }
        }, UNDO_TIMEOUT);
    }

    /**
     * 隐藏 Toast
     * @private
     */
    function dismissToast() {
        if (currentToast) {
            currentToast.classList.add('hiding');
            setTimeout(() => {
                if (currentToast && currentToast.parentElement) {
                    currentToast.parentElement.removeChild(currentToast);
                }
                currentToast = null;
            }, 300);
        }
        
        if (undoTimeout) {
            clearTimeout(undoTimeout);
            undoTimeout = null;
        }
    }

    /**
     * HTML 转义
     * @private
     * @param {string} str - 要转义的字符串
     * @returns {string}
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // =============================================
    // 便捷方法
    // =============================================

    /**
     * 记录链接删除操作
     * @param {Object} link - 被删除的链接
     * @returns {boolean}
     */
    function recordLinkDelete(link) {
        return record({
            type: ActionTypes.LINK_DELETE,
            description: `删除链接 "${link.name}"`,
            data: { link },
            undo: async () => {
                // 重新添加链接
                if (typeof LinkManager !== 'undefined') {
                    const result = await LinkManager.add({
                        name: link.name,
                        url: link.url,
                        categoryId: link.categoryId
                    });
                    return result.success;
                }
                return false;
            }
        });
    }

    /**
     * 记录任务删除操作
     * @param {Object} task - 被删除的任务
     * @returns {boolean}
     */
    function recordTaskDelete(task) {
        return record({
            type: ActionTypes.TASK_DELETE,
            description: `删除任务 "${task.name}"`,
            data: { task },
            undo: async () => {
                // 重新添加任务
                if (typeof TaskManager !== 'undefined') {
                    const result = await TaskManager.add({
                        name: task.name,
                        deadline: task.deadline,
                        priority: task.priority,
                        description: task.description,
                        links: task.links
                    });
                    return result.success;
                }
                return false;
            }
        });
    }

    /**
     * 记录任务完成状态切换
     * @param {Object} task - 任务对象
     * @param {boolean} previousState - 之前的状态
     * @returns {boolean}
     */
    function recordTaskComplete(task, previousState) {
        return record({
            type: ActionTypes.TASK_COMPLETE,
            description: previousState ? '标记任务为未完成' : '标记任务为已完成',
            data: { task, previousState },
            undo: async () => {
                if (typeof TaskManager !== 'undefined') {
                    await TaskManager.toggleComplete(task.id);
                    return true;
                }
                return false;
            }
        });
    }

    // =============================================
    // 状态查询
    // =============================================

    /**
     * 检查是否有可撤销的操作
     * @returns {boolean}
     */
    function canUndo() {
        return undoStack.length > 0;
    }

    /**
     * 获取撤销栈大小
     * @returns {number}
     */
    function getStackSize() {
        return undoStack.length;
    }

    /**
     * 获取最近的操作
     * @returns {Object|null}
     */
    function getRecentAction() {
        return undoStack.length > 0 ? undoStack[0] : null;
    }

    // =============================================
    // 公开 API
    // =============================================

    return {
        // 操作类型
        ActionTypes,

        // 核心方法
        record,
        undo,
        clear,

        // 便捷方法
        recordLinkDelete,
        recordTaskDelete,
        recordTaskComplete,

        // 状态查询
        canUndo,
        getStackSize,
        getRecentAction
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UndoManager;
}
