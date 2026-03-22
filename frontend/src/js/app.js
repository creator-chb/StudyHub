/**
 * StudyHub 主应用模块
 * 应用入口和全局协调
 * @module App
 */

const App = (function() {
    'use strict';

    /**
     * 应用初始化状态
     * @type {boolean}
     */
    let initialized = false;

    /**
     * 插件注册表
     * @type {Map}
     */
    const plugins = new Map();

    /**
     * 初始化应用
     * @private
     */
    function init() {
        if (initialized) return;

        // 初始化错误处理
        ErrorHandler.initGlobalListener();
        ErrorHandler.on(ErrorHandler.ErrorTypes.STORAGE, (error) => {
            Toast.error('存储操作失败: ' + error.message);
        });

        // 初始化主题
        Theme.init();

        // 初始化键盘快捷键
        Keyboard.init();
        registerDefaultShortcuts();

        // 初始化触摸支持
        Touch.init();

        // 初始化模态框 ESC 监听
        Modal.initEscListener();

        // 初始化认证模块
        initAuth();

        // 订阅数据变更
        LinkManager.subscribe(renderLinks);
        TaskManager.subscribe(renderTasks);

        // 初始渲染
        renderLinks();
        renderTasks();

        // 绑定全局事件
        bindGlobalEvents();

        initialized = true;
        console.log(`StudyHub v${Config.getVersion()} 初始化完成`);
    }

    /**
     * 初始化认证模块和 UI
     * @private
     */
    function initAuth() {
        // 检查 Auth 模块是否存在
        if (typeof Auth === 'undefined') {
            console.warn('[App] Auth 模块未加载，跳过认证初始化');
            return;
        }

        // 初始化认证模块
        Auth.init();

        // 注意：登录/注册按钮由各入口文件（index.html）自行创建
        // 这里只处理认证状态变化的通用逻辑
    }

    /**
     * 注册默认快捷键
     * @private
     */
    function registerDefaultShortcuts() {
        // N - 新建链接
        Keyboard.register('n', () => {
            App.openLinkModal();
        });

        // T - 新建任务
        Keyboard.register('t', () => {
            App.openTaskModal();
        });

        // / - 聚焦搜索
        Keyboard.register('/', () => {
            const searchBox = document.getElementById('linkSearch');
            if (searchBox) {
                searchBox.focus();
                searchBox.select();
            }
        });

        // Ctrl+D - 切换主题
        Keyboard.register('ctrl+d', () => {
            Theme.toggle();
        });

        // Ctrl+E - 导出数据
        Keyboard.register('ctrl+e', () => {
            App.exportData();
        });

        // Ctrl+I - 导入数据
        Keyboard.register('ctrl+i', () => {
            App.importData();
        });
    }

    /**
     * 绑定全局事件
     * @private
     */
    function bindGlobalEvents() {
        // 链接搜索
        const linkSearch = document.getElementById('linkSearch');
        if (linkSearch) {
            linkSearch.addEventListener('input', Utils.debounce(() => {
                renderLinks();
            }, 200));
        }

        // 任务搜索
        const taskSearch = document.getElementById('taskSearch');
        if (taskSearch) {
            taskSearch.addEventListener('input', Utils.debounce(() => {
                renderTasks();
            }, 200));
        }

        // 导入文件选择
        const importFile = document.getElementById('importFile');
        if (importFile) {
            importFile.addEventListener('change', handleImportFile);
        }

        // 主题切换按钮
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => Theme.toggle());
        }
    }

    /**
     * 渲染链接列表
     * @private
     */
    function renderLinks() {
        const container = document.getElementById('linkList');
        if (!container) return;

        const searchTerm = document.getElementById('linkSearch')?.value || '';
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';

        const links = LinkManager.getAll({
            search: searchTerm,
            category: categoryFilter
        });

        Renderer.renderLinks(container, links);
    }

    /**
     * 渲染任务列表
     * @private
     */
    function renderTasks() {
        const container = document.getElementById('taskList');
        if (!container) return;

        const searchTerm = document.getElementById('taskSearch')?.value || '';
        const priorityFilter = document.getElementById('priorityFilter')?.value || 'all';
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';

        const tasks = TaskManager.getAll({
            search: searchTerm,
            priority: priorityFilter,
            status: statusFilter
        });

        Renderer.renderTasks(container, tasks);
    }

    /**
     * 处理导入文件
     * @private
     * @param {Event} event - 文件选择事件
     */
    async function handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const content = await Utils.readFile(file);
            const data = JSON.parse(content);

            // 验证数据
            const validation = Storage.validateImport(data);
            if (!validation.valid) {
                Toast.error('数据格式无效: ' + validation.errors.join(', '));
                return;
            }

            // 确认导入方式
            const result = await Modal.confirm({
                icon: '📥',
                title: '导入数据',
                message: '请选择导入方式：\n• 合并：将新数据与现有数据合并\n• 覆盖：用新数据替换所有现有数据',
                confirmText: '合并导入',
                cancelText: '覆盖导入'
            });

            // 执行导入
            const importResult = Storage.importAll(data, { merge: result.confirmed });

            if (importResult.success) {
                const details = importResult.details;
                const message = `导入成功！链接: ${details.links.imported} 任务: ${details.tasks.imported}${details.links.skipped > 0 || details.tasks.skipped > 0 ? ' (部分已存在数据已跳过)' : ''}`;
                Toast.success(message, 2000);
                
                // 延迟刷新页面，让用户看到成功提示
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                Toast.error(importResult.message);
            }
        } catch (e) {
            Toast.error('导入失败: ' + e.message);
        }

        // 清空文件选择
        event.target.value = '';
    }

    /**
     * 应用公共 API
     */
    return {
        /**
         * 初始化应用
         */
        init,

        /**
         * 打开链接模态框
         * @param {string|null} id - 链接 ID（编辑模式）
         */
        openLinkModal(id = null) {
            LinkManager.setEditingId(id);
            const link = LinkManager.getEditingLink();

            const title = id ? '编辑链接' : '添加链接';
            const content = `
                <div class="form-group">
                    <label>链接名称 *</label>
                    <input id="modalLinkName" value="${link ? Utils.escapeHtml(link.name) : ''}" placeholder="例如：LeetCode 周赛" autocomplete="off">
                    <div class="error-message" id="linkNameError" style="display:none;"></div>
                </div>
                <div class="form-group">
                    <label>链接地址 *</label>
                    <input id="modalLinkUrl" value="${link ? Utils.escapeHtml(link.url) : ''}" placeholder="https://..." autocomplete="off">
                    <div class="error-message" id="linkUrlError" style="display:none;"></div>
                    <div class="field-hint">必须以 http:// 或 https:// 开头</div>
                </div>
                <div class="form-group">
                    <label>分类</label>
                    <select id="modalLinkCategory"></select>
                </div>
            `;

            const modal = Modal.open({
                id: 'linkModal',
                title,
                content,
                buttons: [
                    {
                        text: '取消',
                        className: 'btn-secondary',
                        onClick: () => {}
                    },
                    {
                        text: id ? '保存' : '添加',
                        primary: true,
                        onClick: async () => {
                            const name = document.getElementById('modalLinkName').value.trim();
                            const url = document.getElementById('modalLinkUrl').value.trim();
                            const categoryId = document.getElementById('modalLinkCategory').value;

                            try {
                                let result;
                                if (id) {
                                    result = await LinkManager.update(id, { name, url, categoryId });
                                } else {
                                    result = await LinkManager.add({ name, url, categoryId });
                                }
                                
                                if (result.success) {
                                    Toast.success(id ? '链接更新成功' : '链接添加成功');
                                    Modal.close('linkModal');
                                } else {
                                    Toast.error(result.errors[0]);
                                }
                            } catch (e) {
                                Toast.error('操作失败: ' + e.message);
                            }
                        }
                    }
                ]
            });

            // 渲染分类选项
            const categorySelect = document.getElementById('modalLinkCategory');
            if (categorySelect) {
                Renderer.renderCategoryOptions(categorySelect, link?.categoryId);
            }

            // 聚焦第一个输入框
            setTimeout(() => {
                document.getElementById('modalLinkName')?.focus();
            }, 50);
        },

        /**
         * 打开任务模态框
         * @param {string|null} id - 任务 ID（编辑模式）
         */
        openTaskModal(id = null) {
            TaskManager.setEditingId(id);
            const task = TaskManager.getEditingTask();

            const title = id ? '编辑任务' : '创建任务';
            const now = new Date();
            const defaultTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

            const content = `
                <div class="form-group">
                    <label>任务名称 *</label>
                    <input id="modalTaskName" value="${task ? Utils.escapeHtml(task.name) : ''}" placeholder="例如：提交作业" autocomplete="off">
                    <div class="error-message" id="taskNameError" style="display:none;"></div>
                </div>
                <div class="form-group">
                    <label>截止时间 *</label>
                    <input id="modalTaskTime" type="datetime-local" value="${task ? task.time : defaultTime}">
                    <div class="error-message" id="taskTimeError" style="display:none;"></div>
                </div>
                <div class="form-group">
                    <label>优先级</label>
                    <select id="modalTaskPriority"></select>
                </div>
                <div class="form-group">
                    <label>关联链接（可多选）</label>
                    <div id="modalLinkCheckboxes" class="checkbox-group"></div>
                </div>
                <div class="form-group">
                    <label>手动输入链接（逗号或换行分隔）</label>
                    <textarea id="modalManualLinks" rows="3" placeholder="https://example.com&#10;https://another.com"></textarea>
                    <div class="field-hint">每行一个链接，或逗号分隔</div>
                </div>
            `;

            Modal.open({
                id: 'taskModal',
                title,
                content,
                buttons: [
                    {
                        text: '取消',
                        className: 'btn-secondary',
                        onClick: () => {}
                    },
                    {
                        text: id ? '保存' : '创建',
                        primary: true,
                        onClick: async () => {
                            const name = document.getElementById('modalTaskName').value.trim();
                            const time = document.getElementById('modalTaskTime').value;
                            const priority = document.getElementById('modalTaskPriority').value;

                            // 获取选中的链接
                            const selected = [...document.querySelectorAll('#modalLinkCheckboxes input:checked')]
                                .map(cb => cb.value);

                            // 获取手动输入的链接
                            const manual = document.getElementById('modalManualLinks').value
                                .split(/[\n,]/)
                                .map(s => s.trim())
                                .filter(Boolean);

                            const allLinks = [...new Set([...selected, ...manual])];

                            if (id) {
                                const result = await TaskManager.update(id, { name, time, priority, links: allLinks });
                                if (result.success) {
                                    Toast.success('任务更新成功');
                                    Modal.close('taskModal');
                                    renderTasks();
                                } else {
                                    Toast.error(result.errors?.[0] || '更新失败');
                                }
                            } else {
                                const result = await TaskManager.add({ name, time, priority, links: allLinks });
                                if (result.success) {
                                    Toast.success('任务创建成功');
                                    Modal.close('taskModal');
                                    renderTasks();
                                } else {
                                    Toast.error(result.errors?.[0] || '创建失败');
                                }
                            }
                        }
                    }
                ]
            });

            // 渲染优先级选项
            const prioritySelect = document.getElementById('modalTaskPriority');
            if (prioritySelect) {
                Renderer.renderPriorityOptions(prioritySelect, task?.priority);
            }

            // 渲染链接复选框
            const checkboxContainer = document.getElementById('modalLinkCheckboxes');
            if (checkboxContainer) {
                const selectedUrls = task?.links || [];
                Renderer.renderLinkCheckboxes(checkboxContainer, selectedUrls);
            }

            // 填充手动链接
            if (task && task.links) {
                const linkPoolUrls = LinkManager.getAll().map(l => l.url);
                const manualLinks = task.links.filter(url => !linkPoolUrls.includes(url));
                document.getElementById('modalManualLinks').value = manualLinks.join('\n');
            }

            // 聚焦第一个输入框
            setTimeout(() => {
                document.getElementById('modalTaskName')?.focus();
            }, 50);
        },

        /**
         * 导出数据
         */
        exportData() {
            const data = Storage.exportAll();
            const filename = `studyhub_backup_${new Date().toISOString().slice(0, 10)}.json`;
            Utils.downloadFile(JSON.stringify(data, null, 2), filename);
            Toast.success('数据导出成功');
        },

        /**
         * 导入数据
         */
        importData() {
            document.getElementById('importFile')?.click();
        },

        /**
         * 注册插件
         * @param {string} name - 插件名称
         * @param {Object} plugin - 插件对象
         */
        registerPlugin(name, plugin) {
            if (plugins.has(name)) {
                console.warn(`插件 ${name} 已存在，将被覆盖`);
            }
            plugins.set(name, plugin);
            
            if (typeof plugin.init === 'function') {
                plugin.init(this);
            }
        },

        /**
         * 获取插件
         * @param {string} name - 插件名称
         * @returns {Object|undefined} 插件对象
         */
        getPlugin(name) {
            return plugins.get(name);
        },

        /**
         * 获取所有插件
         * @returns {Array} 插件列表
         */
        getAllPlugins() {
            return Array.from(plugins.entries());
        },

        /**
         * 获取应用统计
         * @returns {Object} 统计信息
         */
        getStats() {
            return {
                links: LinkManager.getStats(),
                tasks: TaskManager.getStats(),
                storage: Storage.getUsage()
            };
        },

        /**
         * 渲染链接列表
         */
        renderLinks,

        /**
         * 渲染任务列表
         */
        renderTasks
    };
})();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}
