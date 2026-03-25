/**
 * StudyHub 存储模块 - 纯净前端版本
 * 仅使用 LocalStorage 进行数据持久化
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
     * 存储模块公共 API
     * 直接代理 LocalStorageAdapter 的所有方法
     */
    const api = {
        // =============================================
        // 模式管理（简化版，仅支持本地模式）
        // =============================================

        /**
         * 获取当前模式
         * @returns {string} 永远返回 'local'
         */
        getMode() {
            return 'local';
        },

        /**
         * 切换存储模式（纯净版不支持切换）
         * @returns {Object} 返回失败结果
         */
        async switchMode(mode) {
            console.log('[Storage] 纯净前端版本仅支持本地存储模式');
            return { success: false, message: '纯净前端版本仅支持本地存储模式' };
        },

        /**
         * 检查是否为 API 模式
         * @returns {boolean} 永远返回 false
         */
        isApiMode() {
            return false;
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
        // 同步方法（纯净版不需要同步）
        // =============================================

        /**
         * 同步数据（纯净版直接返回成功）
         * @returns {Promise<boolean>}
         */
        async sync() {
            return true;
        },

        /**
         * 获取同步状态
         * @returns {Object}
         */
        getSyncState() {
            return { isSyncing: false, lastError: null };
        },

        // =============================================
        // 模式变更监听（纯净版不需要）
        // =============================================

        onModeChange(listener) {
            // 纯净版不需要监听模式变化
        },

        offModeChange(listener) {
            // 纯净版不需要监听模式变化
        },

        // =============================================
        // 数据操作方法（直接使用本地模式）
        // =============================================

        /**
         * 添加链接
         * @param {Object} linkData
         * @returns {Object}
         */
        async addLink(linkData) {
            return LinkManager.add(linkData);
        },

        /**
         * 更新链接
         * @param {string} id
         * @param {Object} updates
         * @returns {Object}
         */
        async updateLink(id, updates) {
            return LinkManager.update(id, updates);
        },

        /**
         * 删除链接
         * @param {string} id
         * @returns {Object}
         */
        async deleteLink(id) {
            return LinkManager.delete(id);
        },

        /**
         * 批量删除链接
         * @param {Array<string>} ids
         * @returns {Object}
         */
        async batchDeleteLinks(ids) {
            return LinkManager.batchDelete(ids);
        },

        /**
         * 切换链接置顶
         * @param {string} id
         * @returns {Object}
         */
        async toggleLinkPin(id) {
            return LinkManager.togglePin(id);
        },

        /**
         * 添加分类
         * @param {Object} categoryData
         * @returns {Object}
         */
        async addCategory(categoryData) {
            return LinkManager.addCategory(categoryData);
        },

        /**
         * 更新分类
         * @param {string} id
         * @param {Object} updates
         * @returns {Object}
         */
        async updateCategory(id, updates) {
            return { success: false, errors: ['暂不支持更新分类'] };
        },

        /**
         * 删除分类
         * @param {string} id
         * @returns {Object}
         */
        async deleteCategory(id) {
            return LinkManager.deleteCategory(id);
        },

        // =============================================
        // 任务操作方法
        // =============================================

        /**
         * 添加任务
         * @param {Object} taskData
         * @returns {Object}
         */
        async addTask(taskData) {
            return TaskManager.add(taskData);
        },

        /**
         * 更新任务
         * @param {string} id
         * @param {Object} updates
         * @returns {Object}
         */
        async updateTask(id, updates) {
            return TaskManager.update(id, updates);
        },

        /**
         * 删除任务
         * @param {string} id
         * @returns {Object}
         */
        async deleteTask(id) {
            return TaskManager.delete(id);
        },

        /**
         * 批量删除任务
         * @param {Array<string>} ids
         * @returns {Object}
         */
        async batchDeleteTasks(ids) {
            return TaskManager.batchDelete(ids);
        },

        /**
         * 切换任务完成状态
         * @param {string} id
         * @returns {Object}
         */
        async toggleTaskComplete(id) {
            return TaskManager.toggleComplete(id);
        },

        /**
         * 批量完成任务
         * @param {Array<string>} ids
         * @returns {Object}
         */
        async batchCompleteTasks(ids) {
            return TaskManager.batchComplete(ids);
        },

        /**
         * 初始化存储模块
         * @returns {Promise<void>}
         */
        async init() {
            console.log('[Storage] 纯净前端版本初始化完成，使用本地存储模式');
        }
    };

    return api;
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
