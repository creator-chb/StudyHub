/**
 * StudyHub 任务管理模块
 * 任务的增删改查和优先级管理
 * @module TaskManager
 */

const TaskManager = (function() {
    'use strict';

    let tasks = [];
    let editingId = null;
    const listeners = new Set();

    const priorities = {
        high: { value: 3, label: '高', color: '#ef4444', icon: '🔴' },
        medium: { value: 2, label: '中', color: '#f59e0b', icon: '🟡' },
        low: { value: 1, label: '低', color: '#10b981', icon: '🟢' }
    };

    function loadData() {
        tasks = Storage.get('tasks', []);
    }

    function saveData() {
        Storage.set('tasks', tasks);
        notifyListeners();
    }

    function notifyListeners() {
        listeners.forEach(callback => {
            try { callback([...tasks]); } catch (e) { console.error('任务管理监听器错误:', e); }
        });
    }

    function validateTask(task) {
        const errors = [];

        if (!task.name || !task.name.trim()) errors.push('任务名称不能为空');
        else if (task.name.length > 100) errors.push('任务名称不能超过 100 个字符');

        if (!task.time) errors.push('请选择截止时间');
        else {
            const deadline = new Date(task.time);
            if (isNaN(deadline.getTime())) errors.push('无效的截止时间');
        }

        const maxLinksPerTask = Config.get('limits.maxLinksPerTask', 10);
        if (task.links && task.links.length > maxLinksPerTask) {
            errors.push(`每个任务最多关联 ${maxLinksPerTask} 个链接`);
        }

        if (task.links && Array.isArray(task.links)) {
            const invalidLinks = task.links.filter(url => {
                const result = Utils.validateUrl(url);
                return !result.valid;
            });
            if (invalidLinks.length > 0) errors.push('包含无效的链接地址');
        }

        return { valid: errors.length === 0, errors };
    }

    loadData();

    return {
        getAll(filters = {}) {
            let result = [...tasks];

            if (filters.status === 'pending') result = result.filter(t => !t.completed);
            else if (filters.status === 'completed') result = result.filter(t => t.completed);

            if (filters.priority && filters.priority !== 'all') {
                result = result.filter(t => t.priority === filters.priority);
            }

            if (filters.search) {
                const keyword = filters.search.toLowerCase();
                result = result.filter(t => t.name.toLowerCase().includes(keyword));
            }

            const pendingTasks = result.filter(t => !t.completed);
            const completedTasks = result.filter(t => t.completed);

            pendingTasks.sort((a, b) => {
                const priorityDiff = priorities[b.priority]?.value - priorities[a.priority]?.value;
                if (priorityDiff !== 0) return priorityDiff;
                return new Date(a.time) - new Date(b.time);
            });

            completedTasks.sort((a, b) => 
                new Date(b.completedAt || 0) - new Date(a.completedAt || 0)
            );

            return { pending: pendingTasks, completed: completedTasks, all: [...pendingTasks, ...completedTasks] };
        },

        getById(id) { return tasks.find(t => t.id === id); },

        async add(taskData) {
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
            if (!validation.valid) return { success: false, errors: validation.errors };

            const maxTasks = Config.get('limits.maxTasks', 100);
            if (tasks.length >= maxTasks) return { success: false, errors: [`任务数量已达上限 (${maxTasks})`] };

            tasks.push(task);
            saveData();

            return { success: true, data: task };
        },

        async update(id, updates) {
            const index = tasks.findIndex(t => t.id === id);
            if (index === -1) return { success: false, errors: ['任务不存在'] };

            const updatedTask = { ...tasks[index], ...updates, id, updatedAt: new Date().toISOString() };

            const validation = validateTask(updatedTask);
            if (!validation.valid) return { success: false, errors: validation.errors };

            tasks[index] = updatedTask;
            saveData();

            return { success: true, data: updatedTask };
        },

        async delete(id) {
            const index = tasks.findIndex(t => t.id === id);
            if (index === -1) return { success: false, errors: ['任务不存在'] };

            tasks.splice(index, 1);
            saveData();

            return { success: true };
        },

        async toggleComplete(id) {
            const task = tasks.find(t => t.id === id);
            if (!task) return { success: false, errors: ['任务不存在'] };

            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            saveData();

            return { success: true, data: task };
        },

        async batchDelete(ids) {
            const initialCount = tasks.length;
            tasks = tasks.filter(t => !ids.includes(t.id));
            const deletedCount = initialCount - tasks.length;
            
            if (deletedCount > 0) saveData();

            return { success: true, deletedCount };
        },

        async batchComplete(ids) {
            let updatedCount = 0;
            const now = new Date().toISOString();

            tasks.forEach(task => {
                if (ids.includes(task.id) && !task.completed) {
                    task.completed = true;
                    task.completedAt = now;
                    updatedCount++;
                }
            });

            if (updatedCount > 0) saveData();

            return { success: true, updatedCount };
        },

        getPriorities() { return { ...priorities }; },

        setEditingId(id) { editingId = id; },
        getEditingId() { return editingId; },
        getEditingTask() { return editingId ? tasks.find(t => t.id === editingId) : undefined; },

        subscribe(callback) { listeners.add(callback); },
        unsubscribe(callback) { listeners.delete(callback); },

        reload() {
            loadData();
            notifyListeners();
        },

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

        openTaskLinks(taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return { success: false, errors: ['任务不存在'] };
            if (!task.links || task.links.length === 0) return { success: false, errors: ['该任务没有关联链接'] };

            const maxOpenLinks = Config.get('limits.maxOpenLinks', 5);
            const linksToOpen = task.links.slice(0, maxOpenLinks);

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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskManager;
}
