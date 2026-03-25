/**
 * StudyHub UI 渲染模块
 * 负责 DOM 渲染和虚拟滚动优化
 * @module Renderer
 */

const Renderer = (function() {
    'use strict';

    /**
     * 渲染容器缓存
     * @type {Map}
     */
    const containers = new Map();

    /**
     * 虚拟滚动状态
     * @type {Map}
     */
    const virtualScrollStates = new Map();

    /**
     * 渲染任务队列
     * @type {Array}
     */
    let renderQueue = [];

    /**
     * 是否正在处理队列
     * @type {boolean}
     */
    let isProcessingQueue = false;

    /**
     * 使用 requestAnimationFrame 批量处理渲染
     * @private
     * @param {Function} callback - 渲染回调
     */
    function scheduleRender(callback) {
        renderQueue.push(callback);
        
        if (!isProcessingQueue) {
            isProcessingQueue = true;
            requestAnimationFrame(() => {
                const queue = [...renderQueue];
                renderQueue = [];
                
                queue.forEach(fn => {
                    try {
                        fn();
                    } catch (e) {
                        console.error('渲染错误:', e);
                    }
                });
                
                isProcessingQueue = false;
            });
        }
    }

    /**
     * 创建链接卡片元素
     * @private
     * @param {Object} link - 链接数据
     * @returns {HTMLElement} 链接卡片元素
     */
    function createLinkCard(link) {
        const card = document.createElement('div');
        card.className = link.pinned ? 'link-card pinned' : 'link-card';
        card.dataset.id = link.id;
        card.dataset.type = 'link';
        card.tabIndex = 0;
        
        // 获取分类信息
        const categories = LinkManager.getCategories();
        const category = categories.find(c => c.id === link.categoryId);
        const categoryColor = category ? category.color : '#4f8cff';

        card.innerHTML = `
            <span class="link-card-category" style="background: ${categoryColor}"></span>
            <span class="link-card-name" title="${Utils.escapeHtml(link.url)}">${Utils.escapeHtml(link.name)}</span>
            <div class="link-card-actions">
                <button class="pin-btn ${link.pinned ? 'pinned' : ''}" title="${link.pinned ? '取消置顶' : '置顶'}">
                    ${link.pinned ? '📌' : '📍'}
                </button>
                <button class="small-btn btn-edit" title="编辑">✏️</button>
                <button class="small-btn btn-danger btn-delete" title="删除">🗑</button>
            </div>
        `;

        // 绑定事件
        const nameEl = card.querySelector('.link-card-name');
        nameEl.addEventListener('click', () => window.open(link.url, '_blank'));

        const pinBtn = card.querySelector('.pin-btn');
        pinBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const result = await LinkManager.togglePin(link.id);
                if (result.success) {
                    Toast.success(result.data.pinned ? '已置顶' : '已取消置顶');
                } else {
                    Toast.error(result.errors?.[0] || '操作失败');
                }
            } catch (e) {
                Toast.error('操作失败: ' + e.message);
            }
        });

        const editBtn = card.querySelector('.btn-edit');
        editBtn.addEventListener('click', () => {
            App.openLinkModal(link.id);
        });

        const deleteBtn = card.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', async () => {
            const result = await Modal.confirm({
                icon: '🗑️',
                title: '删除链接',
                message: `确定要删除 "${link.name}" 吗？此操作不可恢复。`,
                confirmText: '删除',
                cancelText: '取消',
                isDanger: true
            });
            
            if (result.confirmed) {
                try {
                    const deleteResult = await LinkManager.delete(link.id);
                    if (deleteResult.success) {
                        Toast.success('链接已删除');
                    } else {
                        Toast.error(deleteResult.errors?.[0] || '删除失败');
                    }
                } catch (e) {
                    Toast.error('删除失败: ' + e.message);
                }
            }
        });

        // 键盘事件
        card.addEventListener('keydown', (e) => handleLinkKeydown(e, link));

        return card;
    }

    /**
     * 创建任务卡片元素
     * @private
     * @param {Object} task - 任务数据
     * @returns {HTMLElement} 任务卡片元素
     */
    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = task.completed ? 'task completed' : 'task';
        card.dataset.id = task.id;
        card.dataset.type = 'task';
        card.tabIndex = 0;

        const remaining = Utils.getRemainingTime(task.time);
        const priorities = TaskManager.getPriorities();
        const priority = priorities[task.priority] || priorities.medium;

        // 状态徽章
        let statusBadge = '';
        if (task.completed) {
            statusBadge = '<span class="task-status-badge completed">✓ 已完成</span>';
        } else if (remaining.overdue) {
            statusBadge = '<span class="task-status-badge overdue">⚠ 已逾期</span>';
        } else if (remaining.type === 'urgent') {
            statusBadge = '<span class="task-status-badge urgent">⏰ 紧急</span>';
        } else {
            statusBadge = '<span class="task-status-badge pending">进行中</span>';
        }

        // 优先级徽章
        const priorityBadge = `<span class="task-priority-badge" style="background: ${priority.color}20; color: ${priority.color}">${priority.icon} ${priority.label}</span>`;

        // 时间显示
        let timeHtml = '';
        if (task.completed) {
            timeHtml = `<div class="task-time">截止时间：${Utils.formatDateTime(task.time)}</div>`;
        } else {
            const remainingClass = remaining.type === 'overdue' ? 'overdue' : (remaining.type === 'urgent' ? 'urgent' : '');
            timeHtml = `
                <div class="task-time">截止时间：${Utils.formatDateTime(task.time)}</div>
                <div class="task-time-remaining ${remainingClass}">${remaining.text}</div>
            `;
        }

        // 链接预览
        const linksHtml = task.links && task.links.length
            ? `<div class="task-links-preview">${
                task.links.map(url => {
                    const linkObj = LinkManager.getAll().find(l => l.url === url);
                    const label = linkObj ? Utils.escapeHtml(linkObj.name) : Utils.shortenUrl(url);
                    return `<span class="task-link-chip">${label}</span>`;
                }).join('')
            }</div>`
            : '';

        card.innerHTML = `
            <div class="task-header">
                <div class="task-header-left">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <div>
                        <div class="task-title">${Utils.escapeHtml(task.name)} ${statusBadge} ${priorityBadge}</div>
                        ${timeHtml}
                    </div>
                </div>
            </div>
            ${linksHtml}
            <div class="actions">
                <button class="btn-edit">编辑</button>
                <button class="btn-danger btn-delete">删除</button>
                ${task.links && task.links.length ? '<button class="btn-open-links">一键跳转</button>' : ''}
            </div>
        `;

        // 绑定事件
        const checkbox = card.querySelector('.task-checkbox');
        checkbox.addEventListener('change', () => {
            TaskManager.toggleComplete(task.id);
        });

        const editBtn = card.querySelector('.btn-edit');
        editBtn.addEventListener('click', () => {
            App.openTaskModal(task.id);
        });

        const deleteBtn = card.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', async () => {
            const result = await Modal.confirm({
                icon: '🗑️',
                title: '删除任务',
                message: `确定要删除 "${task.name}" 吗？此操作不可恢复。`,
                confirmText: '删除',
                cancelText: '取消',
                isDanger: true
            });
            
            if (result.confirmed) {
                TaskManager.delete(task.id);
                Toast.success('任务已删除');
            }
        });

        const openLinksBtn = card.querySelector('.btn-open-links');
        if (openLinksBtn) {
            openLinksBtn.addEventListener('click', () => {
                const result = TaskManager.openTaskLinks(task.id);
                if (!result.success) {
                    Toast.error(result.errors[0]);
                } else if (result.message) {
                    Toast.warning(result.message);
                }
            });
        }

        // 键盘事件
        card.addEventListener('keydown', (e) => handleTaskKeydown(e, task));

        // 移动端滑动删除
        if (Touch.isTouchDevice()) {
            Touch.makeSwipeable(card, [
                {
                    icon: '🗑',
                    className: 'btn-danger',
                    onClick: async () => {
                        const result = await Modal.confirm({
                            icon: '🗑️',
                            title: '删除任务',
                            message: `确定要删除 "${task.name}" 吗？`,
                            confirmText: '删除',
                            isDanger: true
                        });
                        
                        if (result.confirmed) {
                            TaskManager.delete(task.id);
                            Toast.success('任务已删除');
                        }
                    }
                }
            ]);
        }

        return card;
    }

    /**
     * 处理链接键盘事件
     * @private
     * @param {KeyboardEvent} event - 键盘事件
     * @param {Object} link - 链接数据
     */
    function handleLinkKeydown(event, link) {
        const cards = document.querySelectorAll('.link-card');
        const currentIndex = Array.from(cards).indexOf(event.currentTarget);

        switch(event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (currentIndex < cards.length - 1) {
                    cards[currentIndex + 1].focus();
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (currentIndex > 0) {
                    cards[currentIndex - 1].focus();
                }
                break;
            case 'Enter':
                event.preventDefault();
                window.open(link.url, '_blank');
                break;
        }
    }

    /**
     * 处理任务键盘事件
     * @private
     * @param {KeyboardEvent} event - 键盘事件
     * @param {Object} task - 任务数据
     */
    function handleTaskKeydown(event, task) {
        const tasks = document.querySelectorAll('#taskList > .task, .completed-section .task');
        const currentIndex = Array.from(tasks).indexOf(event.currentTarget);

        switch(event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (currentIndex < tasks.length - 1) {
                    tasks[currentIndex + 1].focus();
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (currentIndex > 0) {
                    tasks[currentIndex - 1].focus();
                }
                break;
            case 'Enter':
                event.preventDefault();
                if (task.links && task.links.length > 0) {
                    TaskManager.openTaskLinks(task.id);
                }
                break;
        }
    }

    /**
     * 渲染模块公共 API
     */
    return {
        /**
         * 渲染链接列表
         * @param {HTMLElement} container - 容器元素
         * @param {Array} links - 链接数据
         */
        renderLinks(container, links) {
            scheduleRender(() => {
                container.innerHTML = '';

                if (links.length === 0) {
                    container.innerHTML = '<div class="empty-hint">暂无链接，点击「添加链接」开始添加</div>';
                    return;
                }

                const fragment = document.createDocumentFragment();
                links.forEach(link => {
                    fragment.appendChild(createLinkCard(link));
                });
                container.appendChild(fragment);
            });
        },

        /**
         * 渲染任务列表
         * @param {HTMLElement} container - 容器元素
         * @param {Object} tasks - 任务数据 { pending: [], completed: [] }
         */
        renderTasks(container, tasks) {
            scheduleRender(() => {
                container.innerHTML = '';

                if (tasks.pending.length === 0 && tasks.completed.length === 0) {
                    container.innerHTML = '<div class="empty-hint">暂无任务，点击「创建任务」开始添加</div>';
                    return;
                }

                const fragment = document.createDocumentFragment();

                // 渲染未完成任务
                if (tasks.pending.length > 0) {
                    tasks.pending.forEach(task => {
                        fragment.appendChild(createTaskCard(task));
                    });
                }

                // 渲染已完成任务分区
                if (tasks.completed.length > 0) {
                    const completedSection = document.createElement('div');
                    completedSection.className = 'completed-section';
                    completedSection.innerHTML = `
                        <div class="completed-section-title">
                            <span>✓</span>
                            <span>已完成 (${tasks.completed.length})</span>
                        </div>
                    `;

                    const completedList = document.createElement('div');
                    completedList.className = 'task-grid';
                    tasks.completed.forEach(task => {
                        completedList.appendChild(createTaskCard(task));
                    });

                    completedSection.appendChild(completedList);
                    fragment.appendChild(completedSection);
                }

                container.appendChild(fragment);
            });
        },

        /**
         * 渲染分类选项
         * @param {HTMLElement} select - 选择框元素
         * @param {string} selectedId - 当前选中的分类 ID
         */
        renderCategoryOptions(select, selectedId = 'default') {
            const categories = LinkManager.getCategories();
            select.innerHTML = categories.map(cat => 
                `<option value="${cat.id}" ${cat.id === selectedId ? 'selected' : ''}>${cat.name}</option>`
            ).join('');
        },

        /**
         * 渲染优先级选项
         * @param {HTMLElement} select - 选择框元素
         * @param {string} selectedPriority - 当前选中的优先级
         */
        renderPriorityOptions(select, selectedPriority = 'medium') {
            const priorities = TaskManager.getPriorities();
            select.innerHTML = Object.entries(priorities).map(([key, value]) =>
                `<option value="${key}" ${key === selectedPriority ? 'selected' : ''}>${value.icon} ${value.label}</option>`
            ).join('');
        },

        /**
         * 渲染链接复选框组
         * @param {HTMLElement} container - 容器元素
         * @param {Array} selectedUrls - 已选中的 URL 列表
         */
        renderLinkCheckboxes(container, selectedUrls = []) {
            const links = LinkManager.getAll();
            
            if (links.length === 0) {
                container.innerHTML = '<span style="color:#aaa;font-size:13px;">暂无可选链接</span>';
                return;
            }

            container.innerHTML = '';
            const fragment = document.createDocumentFragment();

            links.forEach(link => {
                const label = document.createElement('label');
                const isChecked = selectedUrls.includes(link.url);
                label.innerHTML = `
                    <input type="checkbox" value="${Utils.escapeHtml(link.url)}" ${isChecked ? 'checked' : ''}>
                    ${Utils.escapeHtml(link.name)}
                `;
                fragment.appendChild(label);
            });

            container.appendChild(fragment);
        },

        /**
         * 初始化虚拟滚动
         * @param {string} containerId - 容器 ID
         * @param {Array} items - 数据项
         * @param {Function} renderFn - 渲染函数
         */
        initVirtualScroll(containerId, items, renderFn) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const pageSize = Config.get('ui.pagination.pageSize', 50);
            
            virtualScrollStates.set(containerId, {
                items,
                renderFn,
                pageSize,
                renderedCount: 0,
                loading: false
            });

            // 初始渲染
            this.loadMore(containerId);

            // 监听滚动
            container.addEventListener('scroll', Utils.throttle(() => {
                this.checkVirtualScroll(containerId);
            }, 100));
        },

        /**
         * 检查虚拟滚动加载
         * @param {string} containerId - 容器 ID
         */
        checkVirtualScroll(containerId) {
            const state = virtualScrollStates.get(containerId);
            if (!state || state.loading) return;

            const container = document.getElementById(containerId);
            const scrollBottom = container.scrollTop + container.clientHeight;
            const threshold = container.scrollHeight - 200;

            if (scrollBottom >= threshold && state.renderedCount < state.items.length) {
                this.loadMore(containerId);
            }
        },

        /**
         * 加载更多数据
         * @param {string} containerId - 容器 ID
         */
        loadMore(containerId) {
            const state = virtualScrollStates.get(containerId);
            if (!state || state.loading) return;

            state.loading = true;
            const start = state.renderedCount;
            const end = Math.min(start + state.pageSize, state.items.length);
            const itemsToRender = state.items.slice(start, end);

            scheduleRender(() => {
                const container = document.getElementById(containerId);
                itemsToRender.forEach(item => {
                    container.appendChild(state.renderFn(item));
                });
                state.renderedCount = end;
                state.loading = false;
            });
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Renderer;
}
