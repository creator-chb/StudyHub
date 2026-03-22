/**
 * StudyHub API 存储适配器
 * 基于 AbstractStorage 接口，使用后端 API 实现数据同步
 * @module ApiStorageAdapter
 */

const ApiStorageAdapter = (function() {
    'use strict';

    // 创建基类实例
    const adapter = AbstractStorage.create();

    // =============================================
    // 缓存层
    // =============================================

    /**
     * 内存缓存
     * @type {Object}
     */
    const cache = {
        links: [],
        categories: [],
        settings: {},
        lastSync: null
    };

    /**
     * 同步状态
     * @type {Object}
     */
    const syncState = {
        isSyncing: false,
        lastError: null,
        pendingOperations: []
    };

    // =============================================
    // API 基础配置
    // =============================================

    const API_BASE_URL = 'http://localhost:3000/api/v1';

    /**
     * 获取访问令牌
     * @returns {string|null}
     */
    function getAccessToken() {
        return localStorage.getItem('studyhub_access_token');
    }

    /**
     * 发送 API 请求
     * @param {string} endpoint - API 端点
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>}
     */
    async function apiRequest(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = getAccessToken();

        console.log('[ApiStorage] 发起请求:', url, 'Token:', token ? '有' : '无');

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            const data = await response.json();

            if (!response.ok) {
                const error = new Error(data.message || '请求失败');
                error.status = response.status;
                error.data = data;
                throw error;
            }

            console.log('[ApiStorage] 请求成功:', url, data);
            return data;
        } catch (e) {
            console.error('[ApiStorage] 请求失败:', url, e);
            throw e;
        }
    }

    // =============================================
    // 链接 API 操作
    // =============================================

    /**
     * 从服务器获取所有链接
     * @returns {Promise<Array>}
     */
    async function fetchLinks() {
        const response = await apiRequest('/links');
        const links = response.data.links || [];

        // 转换为前端格式
        return links.map(link => ({
            id: link.id,
            name: link.title,
            url: link.url,
            categoryId: link.category_id || 'default',
            pinned: link.is_pinned,
            pinnedAt: link.pinned_at ? new Date(link.pinned_at).getTime() : null,
            createdAt: link.created_at,
            updatedAt: link.updated_at,
            clickCount: link.click_count || 0
        }));
    }

    /**
     * 创建链接
     * @param {Object} linkData - 链接数据
     * @returns {Promise<Object>}
     */
    async function createLink(linkData) {
        const response = await apiRequest('/links', {
            method: 'POST',
            body: JSON.stringify({
                title: linkData.name,
                url: linkData.url,
                category_id: linkData.categoryId === 'default' ? null : linkData.categoryId,
                description: linkData.description || ''
            })
        });

        const link = response.data.link;
        return {
            id: link.id,
            name: link.title,
            url: link.url,
            categoryId: link.category_id || 'default',
            pinned: link.is_pinned,
            pinnedAt: link.pinned_at ? new Date(link.pinned_at).getTime() : null,
            createdAt: link.created_at,
            updatedAt: link.updated_at
        };
    }

    /**
     * 更新链接
     * @param {string} id - 链接 ID
     * @param {Object} updates - 更新数据
     * @returns {Promise<Object>}
     */
    async function updateLink(id, updates) {
        const body = {};
        if (updates.name !== undefined) body.title = updates.name;
        if (updates.url !== undefined) body.url = updates.url;
        if (updates.categoryId !== undefined) {
            body.category_id = updates.categoryId === 'default' ? null : updates.categoryId;
        }
        if (updates.description !== undefined) body.description = updates.description;

        const response = await apiRequest(`/links/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });

        const link = response.data.link;
        return {
            id: link.id,
            name: link.title,
            url: link.url,
            categoryId: link.category_id || 'default',
            pinned: link.is_pinned,
            pinnedAt: link.pinned_at ? new Date(link.pinned_at).getTime() : null,
            createdAt: link.created_at,
            updatedAt: link.updated_at
        };
    }

    /**
     * 删除链接
     * @param {string} id - 链接 ID
     * @returns {Promise<boolean>}
     */
    async function deleteLink(id) {
        await apiRequest(`/links/${id}`, {
            method: 'DELETE'
        });
        return true;
    }

    /**
     * 批量删除链接
     * @param {Array<string>} ids - 链接 ID 列表
     * @returns {Promise<number>}
     */
    async function batchDeleteLinks(ids) {
        const response = await apiRequest('/links/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ ids })
        });
        return response.data.deletedCount;
    }

    /**
     * 切换置顶状态
     * @param {string} id - 链接 ID
     * @returns {Promise<Object>}
     */
    async function toggleLinkPin(id) {
        const response = await apiRequest(`/links/${id}/pin`, {
            method: 'PATCH'
        });

        const link = response.data.link;
        return {
            id: link.id,
            pinned: link.is_pinned,
            pinnedAt: link.pinned_at ? new Date(link.pinned_at).getTime() : null
        };
    }

    // =============================================
    // 分类 API 操作
    // =============================================

    /**
     * 从服务器获取所有分类
     * @returns {Promise<Array>}
     */
    async function fetchCategories() {
        const response = await apiRequest('/categories');
        const categories = response.data.categories || [];

        // 转换为前端格式
        return categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            color: cat.color || '#4f8cff',
            createdAt: cat.created_at,
            updatedAt: cat.updated_at
        }));
    }

    /**
     * 创建分类
     * @param {Object} categoryData - 分类数据
     * @returns {Promise<Object>}
     */
    async function createCategory(categoryData) {
        const response = await apiRequest('/categories', {
            method: 'POST',
            body: JSON.stringify({
                name: categoryData.name,
                color: categoryData.color || '#4f8cff'
            })
        });

        const cat = response.data.category;
        return {
            id: cat.id,
            name: cat.name,
            color: cat.color,
            createdAt: cat.created_at,
            updatedAt: cat.updated_at
        };
    }

    /**
     * 更新分类
     * @param {string} id - 分类 ID
     * @param {Object} updates - 更新数据
     * @returns {Promise<Object>}
     */
    async function updateCategory(id, updates) {
        const response = await apiRequest(`/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });

        const cat = response.data.category;
        return {
            id: cat.id,
            name: cat.name,
            color: cat.color,
            createdAt: cat.created_at,
            updatedAt: cat.updated_at
        };
    }

    /**
     * 删除分类
     * @param {string} id - 分类 ID
     * @returns {Promise<boolean>}
     */
    async function deleteCategory(id) {
        await apiRequest(`/categories/${id}`, {
            method: 'DELETE'
        });
        return true;
    }

    // =============================================
    // 覆盖抽象方法
    // =============================================

    /**
     * 获取数据（同步，从缓存读取）
     * @param {string} key - 数据键名
     * @param {*} defaultValue - 默认值
     * @returns {*} 存储的数据
     */
    adapter.get = function(key, defaultValue = []) {
        if (key === 'links') {
            return cache.links.length > 0 ? [...cache.links] : defaultValue;
        }
        if (key === 'categories') {
            return cache.categories.length > 0 ? [...cache.categories] : defaultValue;
        }
        if (key === 'settings') {
            return { ...cache.settings };
        }
        return defaultValue;
    };

    /**
     * 保存数据（异步，同步到服务器）
     * @param {string} key - 数据键名
     * @param {*} value - 要存储的数据
     * @returns {Promise<boolean>}
     */
    adapter.set = async function(key, value) {
        try {
            if (key === 'links') {
                // 链接的完整替换需要特殊处理
                // 通常不直接调用，而是通过 add/update/delete 方法
                cache.links = [...value];
                this._emit(key, value);
                return true;
            }
            if (key === 'categories') {
                cache.categories = [...value];
                this._emit(key, value);
                return true;
            }
            if (key === 'settings') {
                cache.settings = { ...value };
                // 设置同步保存到 localStorage 作为备份
                localStorage.setItem('studyhub_settings', JSON.stringify(value));
                this._emit(key, value);
                return true;
            }
            return false;
        } catch (e) {
            console.error(`保存 ${key} 失败:`, e);
            return false;
        }
    };

    /**
     * 删除数据
     * @param {string} key - 数据键名
     * @returns {boolean}
     */
    adapter.remove = function(key) {
        if (key === 'links') {
            cache.links = [];
            this._emit(key, null);
            return true;
        }
        if (key === 'categories') {
            cache.categories = [];
            this._emit(key, null);
            return true;
        }
        if (key === 'settings') {
            cache.settings = {};
            localStorage.removeItem('studyhub_settings');
            this._emit(key, null);
            return true;
        }
        return false;
    };

    /**
     * 清空所有数据
     * @returns {Promise<boolean>}
     */
    adapter.clear = async function() {
        try {
            // 批量删除所有链接
            if (cache.links.length > 0) {
                await batchDeleteLinks(cache.links.map(l => l.id));
            }
            // 删除所有分类
            for (const cat of cache.categories) {
                if (cat.id !== 'default') {
                    await deleteCategory(cat.id);
                }
            }

            cache.links = [];
            cache.categories = [];
            cache.settings = {};

            return true;
        } catch (e) {
            console.error('清空数据失败:', e);
            return false;
        }
    };

    /**
     * 获取存储使用情况
     * @returns {Object}
     */
    adapter.getUsage = function() {
        const linksSize = new Blob([JSON.stringify(cache.links)]).size;
        const categoriesSize = new Blob([JSON.stringify(cache.categories)]).size;
        const settingsSize = new Blob([JSON.stringify(cache.settings)]).size;
        const totalSize = linksSize + categoriesSize + settingsSize;

        return {
            totalSize,
            totalSizeFormatted: this.formatBytes(totalSize),
            details: {
                links: {
                    size: linksSize,
                    sizeFormatted: this.formatBytes(linksSize),
                    itemCount: cache.links.length
                },
                categories: {
                    size: categoriesSize,
                    sizeFormatted: this.formatBytes(categoriesSize),
                    itemCount: cache.categories.length
                },
                settings: {
                    size: settingsSize,
                    sizeFormatted: this.formatBytes(settingsSize),
                    itemCount: 1
                }
            },
            lastSync: cache.lastSync,
            isSyncing: syncState.isSyncing
        };
    };

    // =============================================
    // 扩展方法 - 异步操作
    // =============================================

    /**
     * 从服务器同步数据
     * @returns {Promise<boolean>}
     */
    adapter.sync = async function() {
        // 如果正在同步，等待完成
        if (syncState.isSyncing) {
            console.log('[ApiStorage] 同步正在进行中，等待完成...');
            // 等待当前同步完成
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!syncState.isSyncing) {
                        clearInterval(checkInterval);
                        resolve(true);
                    }
                }, 100);
                // 超时处理
                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve(false);
                }, 10000);
            });
        }

        syncState.isSyncing = true;
        syncState.lastError = null;

        console.log('[ApiStorage] 开始同步数据...');

        try {
            const [links, categories] = await Promise.all([
                fetchLinks(),
                fetchCategories()
            ]);

            cache.links = links;
            cache.categories = categories;
            cache.lastSync = new Date().toISOString();

            // 确保有默认分类
            if (!cache.categories.find(c => c.id === 'default')) {
                cache.categories.unshift({
                    id: 'default',
                    name: '默认',
                    color: '#4f8cff'
                });
            }

            console.log('[ApiStorage] 同步完成，链接数:', links.length, '分类数:', categories.length);
            
            this._emit('sync', { links, categories });
            return true;
        } catch (e) {
            console.error('[ApiStorage] 同步失败:', e);
            syncState.lastError = e.message;
            return false;
        } finally {
            syncState.isSyncing = false;
        }
    };

    /**
     * 添加链接
     * @param {Object} linkData - 链接数据
     * @returns {Promise<Object>}
     */
    adapter.addLink = async function(linkData) {
        const link = await createLink(linkData);
        cache.links.push(link);
        this._emit('links', [...cache.links]);
        return { success: true, data: link };
    };

    /**
     * 更新链接
     * @param {string} id - 链接 ID
     * @param {Object} updates - 更新数据
     * @returns {Promise<Object>}
     */
    adapter.updateLink = async function(id, updates) {
        const link = await updateLink(id, updates);
        const index = cache.links.findIndex(l => l.id === id);
        if (index !== -1) {
            cache.links[index] = link;
            this._emit('links', [...cache.links]);
        }
        return { success: true, data: link };
    };

    /**
     * 删除链接
     * @param {string} id - 链接 ID
     * @returns {Promise<Object>}
     */
    adapter.deleteLink = async function(id) {
        await deleteLink(id);
        cache.links = cache.links.filter(l => l.id !== id);
        this._emit('links', [...cache.links]);
        return { success: true };
    };

    /**
     * 批量删除链接
     * @param {Array<string>} ids - 链接 ID 列表
     * @returns {Promise<Object>}
     */
    adapter.batchDeleteLinks = async function(ids) {
        const deletedCount = await batchDeleteLinks(ids);
        cache.links = cache.links.filter(l => !ids.includes(l.id));
        this._emit('links', [...cache.links]);
        return { success: true, deletedCount };
    };

    /**
     * 切换链接置顶状态
     * @param {string} id - 链接 ID
     * @returns {Promise<Object>}
     */
    adapter.toggleLinkPin = async function(id) {
        const result = await toggleLinkPin(id);
        const link = cache.links.find(l => l.id === id);
        if (link) {
            link.pinned = result.pinned;
            link.pinnedAt = result.pinnedAt;
            this._emit('links', [...cache.links]);
        }
        return { success: true, data: link };
    };

    /**
     * 添加分类
     * @param {Object} categoryData - 分类数据
     * @returns {Promise<Object>}
     */
    adapter.addCategory = async function(categoryData) {
        const category = await createCategory(categoryData);
        cache.categories.push(category);
        this._emit('categories', [...cache.categories]);
        return { success: true, data: category };
    };

    /**
     * 更新分类
     * @param {string} id - 分类 ID
     * @param {Object} updates - 更新数据
     * @returns {Promise<Object>}
     */
    adapter.updateCategory = async function(id, updates) {
        const category = await updateCategory(id, updates);
        const index = cache.categories.findIndex(c => c.id === id);
        if (index !== -1) {
            cache.categories[index] = category;
            this._emit('categories', [...cache.categories]);
        }
        return { success: true, data: category };
    };

    /**
     * 删除分类
     * @param {string} id - 分类 ID
     * @returns {Promise<Object>}
     */
    adapter.deleteCategory = async function(id) {
        await deleteCategory(id);
        cache.categories = cache.categories.filter(c => c.id !== id);

        // 将使用该分类的链接移到默认分类
        cache.links.forEach(link => {
            if (link.categoryId === id) {
                link.categoryId = 'default';
            }
        });

        this._emit('categories', [...cache.categories]);
        this._emit('links', [...cache.links]);
        return { success: true };
    };

    /**
     * 获取同步状态
     * @returns {Object}
     */
    adapter.getSyncState = function() {
        return { ...syncState };
    };

    /**
     * 检查是否已登录
     * @returns {boolean}
     */
    adapter.isAuthenticated = function() {
        return !!getAccessToken();
    };

    return adapter;
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiStorageAdapter;
}
