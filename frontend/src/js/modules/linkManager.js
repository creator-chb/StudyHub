/**
 * StudyHub 链接管理模块
 * 链接池的增删改查和分类管理
 * @module LinkManager
 */

const LinkManager = (function() {
    'use strict';

    /**
     * 链接数据
     * @type {Array}
     */
    let links = [];

    /**
     * 分类数据
     * @type {Array}
     */
    let categories = [];

    /**
     * 当前编辑的链接 ID
     * @type {string|null}
     */
    let editingId = null;

    /**
     * 数据变更监听器
     * @type {Set}
     */
    const listeners = new Set();

    /**
     * 从存储加载数据
     * @private
     */
    function loadData() {
        links = Storage.get('links', []);
        categories = Storage.get('categories', [
            { id: 'default', name: '默认', color: '#4f8cff' },
            { id: 'study', name: '学习', color: '#10b981' },
            { id: 'work', name: '工作', color: '#f59e0b' },
            { id: 'entertainment', name: '娱乐', color: '#8b5cf6' }
        ]);
    }

    /**
     * 保存数据到存储
     * @private
     */
    function saveData() {
        Storage.set('links', links);
        Storage.set('categories', categories);
        notifyListeners();
    }

    /**
     * 通知数据变更
     * @private
     */
    function notifyListeners() {
        listeners.forEach(callback => {
            try {
                callback({ links: [...links], categories: [...categories] });
            } catch (e) {
                console.error('链接管理监听器错误:', e);
            }
        });
    }

    /**
     * 验证链接数据
     * @private
     * @param {Object} link - 链接对象
     * @returns {Object} 验证结果
     */
    function validateLink(link) {
        const errors = [];

        if (!link.name || !link.name.trim()) {
            errors.push('链接名称不能为空');
        } else if (link.name.length > 50) {
            errors.push('链接名称不能超过 50 个字符');
        }

        const urlValidation = Utils.validateUrl(link.url);
        if (!urlValidation.valid) {
            errors.push(urlValidation.error);
        }

        // 检查重复 URL
        const existingLink = links.find(l => 
            l.url === link.url && l.id !== link.id
        );
        if (existingLink) {
            errors.push('该链接已存在');
        }

        return { valid: errors.length === 0, errors };
    }

    // 初始化加载数据
    loadData();

    /**
     * 链接管理模块公共 API
     */
    return {
        /**
         * 获取所有链接
         * @param {Object} filters - 过滤条件
         * @param {string} filters.category - 分类 ID
         * @param {string} filters.search - 搜索关键词
         * @param {boolean} filters.pinnedOnly - 仅置顶
         * @returns {Array} 链接列表
         */
        getAll(filters = {}) {
            let result = [...links];

            if (filters.category) {
                result = result.filter(l => l.categoryId === filters.category);
            }

            if (filters.search) {
                const keyword = filters.search.toLowerCase();
                result = result.filter(l => 
                    l.name.toLowerCase().includes(keyword) ||
                    l.url.toLowerCase().includes(keyword)
                );
            }

            if (filters.pinnedOnly) {
                result = result.filter(l => l.pinned);
            }

            // 排序：置顶在前，然后按置顶时间倒序
            result.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                if (a.pinned && b.pinned) {
                    return (b.pinnedAt || 0) - (a.pinnedAt || 0);
                }
                return 0;
            });

            return result;
        },

        /**
         * 根据 ID 获取链接
         * @param {string} id - 链接 ID
         * @returns {Object|undefined} 链接对象
         */
        getById(id) {
            return links.find(l => l.id === id);
        },

        /**
         * 添加链接
         * @param {Object} linkData - 链接数据
         * @returns {Object|Promise<Object>} 操作结果
         */
        add(linkData) {
            const link = {
                id: Utils.generateId(),
                name: linkData.name.trim(),
                url: linkData.url.trim(),
                categoryId: linkData.categoryId || 'default',
                pinned: false,
                createdAt: new Date().toISOString()
            };

            const validation = validateLink(link);
            if (!validation.valid) {
                return { success: false, errors: validation.errors };
            }

            // 检查数量限制
            const maxLinks = Config.get('limits.maxLinks', 200);
            if (links.length >= maxLinks) {
                return { success: false, errors: [`链接数量已达上限 (${maxLinks})`] };
            }

            // 检查是否为 API 模式
            if (Storage.isApiMode()) {
                // API 模式：返回 Promise
                return Storage.addLink(linkData).then(result => {
                    if (result.success) {
                        // 更新本地缓存
                        links.push(result.data);
                        notifyListeners();
                    }
                    return result;
                });
            }

            // 本地模式：同步操作
            links.push(link);
            saveData();

            return { success: true, data: link };
        },

        /**
         * 更新链接
         * @param {string} id - 链接 ID
         * @param {Object} updates - 更新数据
         * @returns {Object|Promise<Object>} 操作结果
         */
        update(id, updates) {
            const index = links.findIndex(l => l.id === id);
            if (index === -1) {
                return { success: false, errors: ['链接不存在'] };
            }

            const updatedLink = {
                ...links[index],
                ...updates,
                id, // 保持 ID 不变
                updatedAt: new Date().toISOString()
            };

            const validation = validateLink(updatedLink);
            if (!validation.valid) {
                return { success: false, errors: validation.errors };
            }

            // 检查是否为 API 模式
            if (Storage.isApiMode()) {
                // API 模式：返回 Promise
                return Storage.updateLink(id, updates).then(result => {
                    if (result.success) {
                        links[index] = result.data;
                        notifyListeners();
                    }
                    return result;
                });
            }

            // 本地模式：同步操作
            links[index] = updatedLink;
            saveData();

            return { success: true, data: updatedLink };
        },

        /**
         * 删除链接
         * @param {string} id - 链接 ID
         * @returns {Object|Promise<Object>} 操作结果
         */
        delete(id) {
            const index = links.findIndex(l => l.id === id);
            if (index === -1) {
                return { success: false, errors: ['链接不存在'] };
            }

            // 检查是否为 API 模式
            if (Storage.isApiMode()) {
                // API 模式：返回 Promise
                return Storage.deleteLink(id).then(result => {
                    if (result.success) {
                        links.splice(index, 1);
                        notifyListeners();
                    }
                    return result;
                });
            }

            // 本地模式：同步操作
            links.splice(index, 1);
            saveData();

            return { success: true };
        },

        /**
         * 切换置顶状态
         * @param {string} id - 链接 ID
         * @returns {Object|Promise<Object>} 操作结果
         */
        togglePin(id) {
            const link = links.find(l => l.id === id);
            if (!link) {
                return { success: false, errors: ['链接不存在'] };
            }

            // 检查是否为 API 模式
            if (Storage.isApiMode()) {
                return Storage.toggleLinkPin(id).then(result => {
                    if (result.success) {
                        link.pinned = result.data.pinned;
                        link.pinnedAt = result.data.pinnedAt;
                        notifyListeners();
                    }
                    return result;
                });
            }

            // 本地模式：同步操作
            link.pinned = !link.pinned;
            link.pinnedAt = link.pinned ? Date.now() : null;
            saveData();

            return { success: true, data: link };
        },

        /**
         * 批量删除链接
         * @param {Array} ids - 链接 ID 列表
         * @returns {Object|Promise<Object>} 操作结果
         */
        batchDelete(ids) {
            // 检查是否为 API 模式
            if (Storage.isApiMode()) {
                return Storage.batchDeleteLinks(ids).then(result => {
                    if (result.success) {
                        links = links.filter(l => !ids.includes(l.id));
                        notifyListeners();
                    }
                    return result;
                });
            }

            // 本地模式：同步操作
            const initialCount = links.length;
            links = links.filter(l => !ids.includes(l.id));
            const deletedCount = initialCount - links.length;
            
            if (deletedCount > 0) {
                saveData();
            }

            return { success: true, deletedCount };
        },

        /**
         * 获取所有分类
         * @returns {Array} 分类列表
         */
        getCategories() {
            return [...categories];
        },

        /**
         * 添加分类
         * @param {Object} categoryData - 分类数据
         * @returns {Object} 操作结果
         */
        addCategory(categoryData) {
            const maxCategories = Config.get('limits.maxCategories', 20);
            if (categories.length >= maxCategories) {
                return { success: false, errors: [`分类数量已达上限 (${maxCategories})`] };
            }

            if (!categoryData.name || !categoryData.name.trim()) {
                return { success: false, errors: ['分类名称不能为空'] };
            }

            const category = {
                id: Utils.generateId(),
                name: categoryData.name.trim(),
                color: categoryData.color || '#4f8cff'
            };

            categories.push(category);
            Storage.set('categories', categories);

            return { success: true, data: category };
        },

        /**
         * 删除分类
         * @param {string} categoryId - 分类 ID
         * @returns {Object} 操作结果
         */
        deleteCategory(categoryId) {
            // 将使用该分类的链接移到默认分类
            links.forEach(link => {
                if (link.categoryId === categoryId) {
                    link.categoryId = 'default';
                }
            });

            categories = categories.filter(c => c.id !== categoryId);
            saveData();

            return { success: true };
        },

        /**
         * 设置当前编辑的链接
         * @param {string|null} id - 链接 ID
         */
        setEditingId(id) {
            editingId = id;
        },

        /**
         * 获取当前编辑的链接 ID
         * @returns {string|null}
         */
        getEditingId() {
            return editingId;
        },

        /**
         * 获取当前编辑的链接
         * @returns {Object|undefined}
         */
        getEditingLink() {
            return editingId ? links.find(l => l.id === editingId) : undefined;
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
            console.log('[LinkManager] 重新加载数据...');
            loadData();
            notifyListeners();
        },

        /**
         * 获取链接统计
         * @returns {Object} 统计信息
         */
        getStats() {
            return {
                total: links.length,
                pinned: links.filter(l => l.pinned).length,
                byCategory: categories.map(c => ({
                    category: c,
                    count: links.filter(l => l.categoryId === c.id).length
                }))
            };
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinkManager;
}
