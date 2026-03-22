/**
 * StudyHub 存储工厂模块
 * 根据 features.backendSync 配置选择适当的存储适配器
 * 支持运行时动态切换本地/API 模式
 * @module Storage
 */

const Storage = (function() {
    'use strict';

    /**
     * 当前存储适配器实例
     * @type {Object}
     */
    let currentAdapter = LocalStorageAdapter;

    /**
     * 当前模式
     * @type {string}
     */
    let currentMode = 'local';

    /**
     * 模式切换监听器
     * @type {Set<Function>}
     */
    const modeListeners = new Set();

    /**
     * 获取当前模式
     * @returns {string}
     */
    function getMode() {
        return currentMode;
    }

    /**
     * 切换存储模式
     * @param {string} mode - 'local' 或 'api'
     * @param {Object} options - 切换选项
     * @param {boolean} options.syncData - 是否同步数据（从当前模式同步到新模式）
     * @returns {Promise<Object>}
     */
    async function switchMode(mode, options = { syncData: false }) {
        console.log('[Storage] 切换模式请求:', mode, '当前模式:', currentMode);
        
        if (mode === currentMode) {
            return { success: true, message: '模式未改变' };
        }

        const previousMode = currentMode;
        const previousAdapter = currentAdapter;

        try {
            // 创建新适配器
            if (mode === 'api') {
                // 检查是否已登录
                const isAuth = ApiStorageAdapter.isAuthenticated();
                console.log('[Storage] 检查登录状态:', isAuth);
                
                if (!isAuth) {
                    return {
                        success: false,
                        message: '请先登录以使用云端同步功能',
                        requireAuth: true
                    };
                }

                currentAdapter = ApiStorageAdapter;
                console.log('[Storage] 开始同步数据...');

                // 从服务器同步数据
                const syncResult = await currentAdapter.sync();
                console.log('[Storage] 同步结果:', syncResult);
                
                if (!syncResult) {
                    currentAdapter = previousAdapter;
                    return { success: false, message: '数据同步失败，请检查网络连接' };
                }
            } else {
                currentAdapter = LocalStorageAdapter;

                // 如果需要，从 API 模式同步数据到本地
                if (options.syncData && previousAdapter) {
                    const links = previousAdapter.get('links', []);
                    const categories = previousAdapter.get('categories', []);
                    currentAdapter.set('links', links);
                    currentAdapter.set('categories', categories);
                }
            }

            currentMode = mode;

            // 更新配置
            Config.set('features.backendSync', mode === 'api');

            // 通知监听器
            notifyModeChange(mode, previousMode);

            return {
                success: true,
                message: mode === 'api' ? '已切换到云端同步模式' : '已切换到本地存储模式'
            };
        } catch (e) {
            console.error('[Storage] 切换模式失败:', e);
            currentAdapter = previousAdapter;
            return { success: false, message: '切换失败: ' + e.message };
        }
    }

    /**
     * 初始化存储适配器
     * @private
     */
    async function initAdapter() {
        const backendSync = Config.get('features.backendSync', false);
        const isAuthenticated = ApiStorageAdapter.isAuthenticated();

        console.log('[Storage] 初始化适配器, backendSync:', backendSync, 'isAuthenticated:', isAuthenticated);

        if (backendSync && isAuthenticated) {
            currentMode = 'api';
            currentAdapter = ApiStorageAdapter;
            console.log('[Storage] 使用 API 模式，开始同步数据...');
            // 立即从服务器同步数据，确保缓存中有数据
            try {
                const syncResult = await currentAdapter.sync();
                console.log('[Storage] 初始化同步结果:', syncResult);
                if (!syncResult) {
                    console.warn('[Storage] 初始化同步失败，回退到本地模式');
                    currentMode = 'local';
                    currentAdapter = LocalStorageAdapter;
                }
            } catch (e) {
                console.error('[Storage] 初始化同步出错:', e);
                currentMode = 'local';
                currentAdapter = LocalStorageAdapter;
            }
        } else {
            currentMode = 'local';
            currentAdapter = LocalStorageAdapter;
            console.log('[Storage] 使用本地模式');
        }
    }

    /**
     * 通知模式变更
     * @param {string} newMode
     * @param {string} previousMode
     */
    function notifyModeChange(newMode, previousMode) {
        modeListeners.forEach(listener => {
            try {
                listener(newMode, previousMode);
            } catch (e) {
                console.error('[Storage] 模式监听器错误:', e);
            }
        });
    }

    /**
     * 订阅模式变更
     * @param {Function} listener
     */
    function onModeChange(listener) {
        modeListeners.add(listener);
    }

    /**
     * 取消订阅模式变更
     * @param {Function} listener
     */
    function offModeChange(listener) {
        modeListeners.delete(listener);
    }

    /**
     * 显式初始化存储适配器
     * 应在所有依赖模块加载完成后调用
     * @returns {Promise<void>}
     */
    async function init() {
        console.log('[Storage] 开始初始化...');
        await initAdapter();
        console.log('[Storage] 初始化完成，当前模式:', currentMode);
    }

    /**
     * 存储模块公共 API
     * 代理当前适配器的所有方法
     */
    const api = {
        // =============================================
        // 模式管理
        // =============================================

        /**
         * 获取当前模式
         * @returns {string} 'local' 或 'api'
         */
        getMode,

        /**
         * 切换存储模式
         * @param {string} mode - 'local' 或 'api'
         * @param {Object} options - 切换选项
         * @returns {Promise<Object>}
         */
        switchMode,

        /**
         * 订阅模式变更
         * @param {Function} listener
         */
        onModeChange,

        /**
         * 取消订阅模式变更
         * @param {Function} listener
         */
        offModeChange,

        /**
         * 检查是否为 API 模式
         * @returns {boolean}
         */
        isApiMode() {
            return currentMode === 'api';
        },

        // =============================================
        // 代理适配器方法
        // =============================================

        get(key, defaultValue) {
            return currentAdapter.get(key, defaultValue);
        },

        set(key, value) {
            return currentAdapter.set(key, value);
        },

        remove(key) {
            return currentAdapter.remove(key);
        },

        clear() {
            return currentAdapter.clear();
        },

        getUsage() {
            return currentAdapter.getUsage();
        },

        subscribe(key, callback) {
            return currentAdapter.subscribe(key, callback);
        },

        unsubscribe(key, callback) {
            return currentAdapter.unsubscribe(key, callback);
        },

        exportAll() {
            return currentAdapter.exportAll();
        },

        importAll(data, options) {
            return currentAdapter.importAll(data, options);
        },

        validateImport(data) {
            return currentAdapter.validateImport(data);
        },

        formatBytes(bytes) {
            return currentAdapter.formatBytes(bytes);
        },

        // =============================================
        // API 模式专用方法（本地模式时返回模拟响应）
        // =============================================

        /**
         * 同步数据（仅 API 模式有效）
         * @returns {Promise<boolean>}
         */
        async sync() {
            if (currentMode === 'api' && currentAdapter.sync) {
                return currentAdapter.sync();
            }
            return true;
        },

        /**
         * 添加链接
         * @param {Object} linkData
         * @returns {Promise<Object>}
         */
        async addLink(linkData) {
            if (currentMode === 'api' && currentAdapter.addLink) {
                return currentAdapter.addLink(linkData);
            }
            // 本地模式：同步操作
            const result = LinkManager.add(linkData);
            return result;
        },

        /**
         * 更新链接
         * @param {string} id
         * @param {Object} updates
         * @returns {Promise<Object>}
         */
        async updateLink(id, updates) {
            if (currentMode === 'api' && currentAdapter.updateLink) {
                return currentAdapter.updateLink(id, updates);
            }
            return LinkManager.update(id, updates);
        },

        /**
         * 删除链接
         * @param {string} id
         * @returns {Promise<Object>}
         */
        async deleteLink(id) {
            if (currentMode === 'api' && currentAdapter.deleteLink) {
                return currentAdapter.deleteLink(id);
            }
            return LinkManager.delete(id);
        },

        /**
         * 批量删除链接
         * @param {Array<string>} ids
         * @returns {Promise<Object>}
         */
        async batchDeleteLinks(ids) {
            if (currentMode === 'api' && currentAdapter.batchDeleteLinks) {
                return currentAdapter.batchDeleteLinks(ids);
            }
            return LinkManager.batchDelete(ids);
        },

        /**
         * 切换链接置顶
         * @param {string} id
         * @returns {Promise<Object>}
         */
        async toggleLinkPin(id) {
            if (currentMode === 'api' && currentAdapter.toggleLinkPin) {
                return currentAdapter.toggleLinkPin(id);
            }
            return LinkManager.togglePin(id);
        },

        /**
         * 添加分类
         * @param {Object} categoryData
         * @returns {Promise<Object>}
         */
        async addCategory(categoryData) {
            if (currentMode === 'api' && currentAdapter.addCategory) {
                return currentAdapter.addCategory(categoryData);
            }
            return LinkManager.addCategory(categoryData);
        },

        /**
         * 更新分类
         * @param {string} id
         * @param {Object} updates
         * @returns {Promise<Object>}
         */
        async updateCategory(id, updates) {
            if (currentMode === 'api' && currentAdapter.updateCategory) {
                return currentAdapter.updateCategory(id, updates);
            }
            // 本地模式暂不支持直接更新分类
            return { success: false, errors: ['本地模式暂不支持更新分类'] };
        },

        /**
         * 删除分类
         * @param {string} id
         * @returns {Promise<Object>}
         */
        async deleteCategory(id) {
            if (currentMode === 'api' && currentAdapter.deleteCategory) {
                return currentAdapter.deleteCategory(id);
            }
            return LinkManager.deleteCategory(id);
        },

        /**
         * 获取同步状态
         * @returns {Object}
         */
        getSyncState() {
            if (currentMode === 'api' && currentAdapter.getSyncState) {
                return currentAdapter.getSyncState();
            }
            return { isSyncing: false, lastError: null };
        },

        /**
         * 初始化存储模块
         */
        init
    };

    return api;
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
