/**
 * StudyHub 任务管理模块
 * 任务的增删改查和优先级管理
 * @module TaskManager
 */

const TaskManager = (function() {
    'use strict';

    /**
     * 任务数据
     * @type {Array}
     */
    let tasks = [];

    /**
     * 当前编辑的任务 ID
     * @type {string|null}
     */
    let editingId = null;

    /**
     * 数据变更监听器
     * @type {Set}
     */
    const listeners = new Set();

    /**
     * 优先级配置
     * @type {Object}
     */
    const priorities = {
        high: { value: 3, label: '高', color: '#ef4444', icon: '🔴' },
        medium: { value: 2, label: '中', color: '#f59e0b', icon: '🟡' },
        low: { value: 1, label: '低', color: '#10b981', icon: '🟢' }
    };

    /**
     * 从存储加载数据
     * @private
     */
    function loadData() {
        tasks = Storage.get('tasks', []);
    }

    /**
     * 保存数据到存储
     * @private
     */
    function saveData() {
        Storage.set('tasks', tasks);
        notifyListeners();
    }

    /**
     * 通知数据变更
     * @private
     */
    function notifyListeners() {
        listeners.forEach(callback => {
            try {
                callback([...tasks]);
            } catch (e) {
                console.error('任务管理监听器错误:', e);
            }
        });
    }

    /**
     * 验证任务数据
     * @private
     * @param {Object} task - 任务对象
     * @returns {Object} 验证结果
     */
    function validateTask(task) {
        const errors = [];

        if (!task.name || !task.name.trim()) {
            errors.push('任务名称不能为空');
        } else if (task.name.length > 100) {
            errors.push('任务名称不能超过 100 个字符');
        }

        if (!task.time) {
            errors.push('请选择截止时间');
        } else {
            const deadline = new Date(task.time);
            if (isNaN(deadline.getTime())) {
                errors.push('无效的截止时间');
            }
        }

        // 验证链接数量
        const maxLinksPerTask = Config.get('limits.maxLinksPerTask', 10);
        if (task.links && task.links.length > maxLinksPerTask) {
            errors.push(`每个任务最多关联 ${maxLinksPerTask} 个链接`);
        }

        // 验证链接 URL
        if (task.links && Array.isArray(task.links)) {
            const invalidLinks = task.links.filter(url => {
                const result = Utils.validateUrl(url);
                return !result.valid;
            });
            if (invalidLinks.length > 0) {
                errors.push('包含无效的链接地址');
            }
        }

        return { valid: errors.length === 0, errors };
    }

    // 初始化加载数据
    loadData();

    /**
     * 任务管理模块公共 API
     */
    return {
        /**
         * 获取所有任务
         * @param {Object} filters - 过滤条件
         * @param {string} filters.status - 状态 (pending/completed/all)
         * @param {string} filters.priority - 优先级 (high/medium/low)
         * @param {string} filters.search - 搜索关键词
         * @returns {Object} 任务列表（按状态分组）
         */
        getAll(filters = {}) {
            let result = [...tasks];

            // 状态过滤
            if (filters.status === 'pending') {
                result = result.filter(t => !t.completed);
            } else if (filters.status === 'completed') {
                result = result.filter(t => t.completed);
            }

            // 优先级过滤
            if (filters.priority && filters.priority !== 'all') {
                result = result.filter(t => t.priority === filters.priority);
            }

            // 搜索过滤
            if (filters.search) {
                const keyword = filters.search.toLowerCase();
                result = result.filter(t => 
                    t.name.toLowerCase().includes(keyword)
                );
            }

            // 分离已完成和未完成任务
            const pendingTasks = result.filter(t => !t.completed);
            const completedTasks = result.filter(t => t.completed);

            // 未完成任务排序：优先级高 -> 截止时间早
            pendingTasks.sort((a, b) => {
                const priorityDiff = priorities[b.priority]?.value - priorities[a.priority]?.value;
                if (priorityDiff !== 0) return priorityDiff;
                return new Date(a.time) - new Date(b.time);
            });

            // 已完成任务排序：完成时间倒序
            completedTasks.sort((a, b) => 
                new Date(b.completedAt || 0) - new Date(a.completedAt || 0)
            );

            return {
                pending: pendingTasks,
                completed: completedTasks,
                all: [...pendingTasks, ...completedTasks]
            };
        },

        /**
         * 根据 ID 获取任务
         * @param {string} id - 任务 ID
         * @returns {Object|undefined} 任务对象
         */
        getById(id) {
            return tasks.find(t => t.id === id);
        },

        /**
         * 添加任务
         * @param {Object} taskData - 任务数据
         * @returns {Object} 操作结果
         */
        async add(taskData) {
            // 如果是 API 模式，通过 Storage 层操作
            if (typeof Storage !== 'undefined' && Storage.isApiMode && Storage.isApiMode()) {
                const result = await Storage.addTask(taskData);
                if (result.success) {
                    // 重新从 Storage 加载数据
                    loadData();
                    notifyListeners();
                }
                return result;
            }

            const task = {
                id: Utils.generateId(),
                name: taskData.name.trim(),
                time: taskData.time,
                priority: taskData.priority || 'medium',
                links: taskData.links || [],
                completed: false,
                createdAt: new Date().toISOString()
            };

            const validation = validateTask(task);
            if (!validation.valid) {
                return { success: false, errors: validation.errors };
            }

            // 检查数量限制
            const maxTasks = Config.get('limits.maxTasks', 100);
            if (tasks.length >= maxTasks) {
                return { success: false, errors: [`任务数量已达上限 (${maxTasks})`] };
            }

            tasks.push(task);
            saveData();

            return { success: true, data: task };
        },

        /**
         * 更新任务
         * @param {string} id - 任务 ID
         * @param {Object} updates - 更新数据
         * @returns {Object} 操作结果
         */
        async update(id, updates) {
            // 如果是 API 模式，通过 Storage 层操作
            if (typeof Storage !== 'undefined' && Storage.isApiMode && Storage.isApiMode()) {
                const result = await Storage.updateTask(id, updates);
                if (result.success) {
                    loadData();
                    notifyListeners();
                }
                return result;
            }

            const index = tasks.findIndex(t => t.id === id);
            if (index === -1) {
                return { success: false, errors: ['任务不存在'] };
            }

            const updatedTask = {
                ...tasks[index],
                ...updates,
                id, // 保持 ID 不变
                updatedAt: new Date().toISOString()
            };

            const validation = validateTask(updatedTask);
            if (!validation.valid) {
                return { success: false, errors: validation.errors };
            }

            tasks[index] = updatedTask;
            saveData();

            return { success: true, data: updatedTask };
        },

        /**
         * 删除任务
         * @param {string} id - 任务 ID
         * @returns {Object} 操作结果
         */
        async delete(id) {
            // 如果是 API 模式，通过 Storage 层操作
            if (typeof Storage !== 'undefined' && Storage.isApiMode && Storage.isApiMode()) {
                const result = await Storage.deleteTask(id);
                if (result.success) {
                    loadData();
                    notifyListeners();
                }
                return result;
            }

            const index = tasks.findIndex(t => t.id === id);
            if (index === -1) {
                return { success: false, errors: ['任务不存在'] };
            }

            tasks.splice(index, 1);
            saveData();

            return { success: true };
        },

        /**
         * 切换任务完成状态
         * @param {string} id - 任务 ID
         * @returns {Object} 操作结果
         */
        async toggleComplete(id) {
            // 如果是 API 模式，通过 Storage 层操作
            if (typeof Storage !== 'undefined' && Storage.isApiMode && Storage.isApiMode()) {
                const result = await Storage.toggleTaskComplete(id);
                if (result.success) {
                    loadData();
                    notifyListeners();
                }
                return result;
            }

            const task = tasks.find(t => t.id === id);
            if (!task) {
                return { success: false, errors: ['任务不存在'] };
            }

            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            saveData();

            return { success: true, data: task };
        },

        /**
         * 批量删除任务
         * @param {Array} ids - 任务 ID 列表
         * @returns {Object} 操作结果
         */
        async batchDelete(ids) {
            // 如果是 API 模式，通过 Storage 层操作
            if (typeof Storage !== 'undefined' && Storage.isApiMode && Storage.isApiMode()) {
                const result = await Storage.batchDeleteTasks(ids);
                if (result.success) {
                    loadData();
                    notifyListeners();
                }
                return result;
            }

            const initialCount = tasks.length;
            tasks = tasks.filter(t => !ids.includes(t.id));
            const deletedCount = initialCount - tasks.length;
            
            if (deletedCount > 0) {
                saveData();
            }

            return { success: true, deletedCount };
        },

        /**
         * 批量完成任务
         * @param {Array} ids - 任务 ID 列表
         * @returns {Object} 操作结果
         */
        async batchComplete(ids) {
            // 如果是 API 模式，通过 Storage 层操作
            if (typeof Storage !== 'undefined' && Storage.isApiMode && Storage.isApiMode()) {
                const result = await Storage.batchCompleteTasks(ids);
                if (result.success) {
                    loadData();
                    notifyListeners();
                }
                return result;
            }

            let updatedCount = 0;
            const now = new Date().toISOString();

            tasks.forEach(task => {
                if (ids.includes(task.id) && !task.completed) {
                    task.completed = true;
                    task.completedAt = now;
                    updatedCount++;
                }
            });

            if (updatedCount > 0) {
                saveData();
            }

            return { success: true, updatedCount };
        },

        /**
         * 获取优先级配置
         * @returns {Object} 优先级配置
         */
        getPriorities() {
            return { ...priorities };
        },

        /**
         * 设置当前编辑的任务
         * @param {string|null} id - 任务 ID
         */
        setEditingId(id) {
            editingId = id;
        },

        /**
         * 获取当前编辑的任务 ID
         * @returns {string|null}
         */
        getEditingId() {
            return editingId;
        },

        /**
         * 获取当前编辑的任务
         * @returns {Object|undefined}
         */
        getEditingTask() {
            return editingId ? tasks.find(t => t.id === editingId) : undefined;
        },

        /**
         * 订阅数据变更
         * @param {Function} callback - 回调函数
         */
        subscribe(callback) {
            listeners.add(callback);
        },

        /**
         * 取消订阅
         * @param {Function} callback - 回调函数
         */
        unsubscribe(callback) {
            listeners.delete(callback);
        },

        /**
         * 重新从存储加载数据
         * 用于存储模式切换后刷新数据
         */
        reload() {
            loadData();
            notifyListeners();
        },

        /**
         * 获取任务统计
         * @returns {Object} 统计信息
         */
        getStats() {
            const now = new Date();
            
            return {
                total: tasks.length,
                pending: tasks.filter(t => !t.completed).length,
                completed: tasks.filter(t => t.completed).length,
                overdue: tasks.filter(t => {
                    if (t.completed) return false;
                    return new Date(t.time) < now;
                }).length,
                urgent: tasks.filter(t => {
                    if (t.completed) return false;
                    const remaining = Utils.getRemainingTime(t.time);
                    return remaining.type === 'urgent' && !remaining.overdue;
                }).length,
                byPriority: {
                    high: tasks.filter(t => t.priority === 'high' && !t.completed).length,
                    medium: tasks.filter(t => t.priority === 'medium' && !t.completed).length,
                    low: tasks.filter(t => t.priority === 'low' && !t.completed).length
                }
            };
        },

        /**
         * 一键打开任务关联链接
         * @param {string} taskId - 任务 ID
         * @returns {Object} 操作结果
         */
        openTaskLinks(taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (!task) {
                return { success: false, errors: ['任务不存在'] };
            }

            if (!task.links || task.links.length === 0) {
                return { success: false, errors: ['该任务没有关联链接'] };
            }

            const maxOpenLinks = Config.get('limits.maxOpenLinks', 5);
            const linksToOpen = task.links.slice(0, maxOpenLinks);

            // 打开链接
            linksToOpen.forEach((url, index) => {
                window.open(url, `_blank_studyhub_${index}`);
            });

            const skipped = task.links.length - linksToOpen.length;
            
            return { 
                success: true, 
                opened: linksToOpen.length,
                skipped,
                message: skipped > 0 ? `已打开 ${linksToOpen.length} 个链接，${skipped} 个链接未打开（超过限制）` : null
            };
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskManager;
}
