/**
 * StudyHub 链接管理模块
 * 链接池的增删改查和分类管理
 * @module LinkManager
 */

const LinkManager = (function() {
    'use strict';

    let links = [];
    let categories = [];
    let editingId = null;
    const listeners = new Set();

    function loadData() {
        links = Storage.get('links', []);
        categories = Storage.get('categories', [
            { id: 'default', name: '默认', color: '#4f8cff' },
            { id: 'study', name: '学习', color: '#10b981' },
            { id: 'work', name: '工作', color: '#f59e0b' },
            { id: 'entertainment', name: '娱乐', color: '#8b5cf6' }
        ]);
    }

    function saveData() {
        Storage.set('links', links);
        Storage.set('categories', categories);
        notifyListeners();
    }

    function notifyListeners() {
        listeners.forEach(callback => {
            try { callback({ links: [...links], categories: [...categories] }); } catch (e) { console.error('链接管理监听器错误:', e); }
        });
    }

    function validateLink(link) {
        const errors = [];

        if (!link.name || !link.name.trim()) errors.push('链接名称不能为空');
        else if (link.name.length > 50) errors.push('链接名称不能超过 50 个字符');

        const urlValidation = Utils.validateUrl(link.url);
        if (!urlValidation.valid) errors.push(urlValidation.error);

        const existingLink = links.find(l => l.url === link.url && l.id !== link.id);
        if (existingLink) errors.push('该链接已存在');

        return { valid: errors.length === 0, errors };
    }

    loadData();

    return {
        getAll(filters = {}) {
            let result = [...links];

            if (filters.category) result = result.filter(l => l.categoryId === filters.category);
            if (filters.search) {
                const keyword = filters.search.toLowerCase();
                result = result.filter(l => 
                    l.name.toLowerCase().includes(keyword) || l.url.toLowerCase().includes(keyword)
                );
            }
            if (filters.pinnedOnly) result = result.filter(l => l.pinned);

            result.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                if (a.pinned && b.pinned) return (b.pinnedAt || 0) - (a.pinnedAt || 0);
                return 0;
            });

            return result;
        },

        getById(id) { return links.find(l => l.id === id); },

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
            if (!validation.valid) return { success: false, errors: validation.errors };

            const maxLinks = Config.get('limits.maxLinks', 200);
            if (links.length >= maxLinks) return { success: false, errors: [`链接数量已达上限 (${maxLinks})`] };

            links.push(link);
            saveData();

            return { success: true, data: link };
        },

        update(id, updates) {
            const index = links.findIndex(l => l.id === id);
            if (index === -1) return { success: false, errors: ['链接不存在'] };

            const updatedLink = { ...links[index], ...updates, id, updatedAt: new Date().toISOString() };

            const validation = validateLink(updatedLink);
            if (!validation.valid) return { success: false, errors: validation.errors };

            links[index] = updatedLink;
            saveData();

            return { success: true, data: updatedLink };
        },

        delete(id) {
            const index = links.findIndex(l => l.id === id);
            if (index === -1) return { success: false, errors: ['链接不存在'] };

            links.splice(index, 1);
            saveData();

            return { success: true };
        },

        togglePin(id) {
            const link = links.find(l => l.id === id);
            if (!link) return { success: false, errors: ['链接不存在'] };

            link.pinned = !link.pinned;
            link.pinnedAt = link.pinned ? Date.now() : null;
            saveData();

            return { success: true, data: link };
        },

        batchDelete(ids) {
            const initialCount = links.length;
            links = links.filter(l => !ids.includes(l.id));
            const deletedCount = initialCount - links.length;
            
            if (deletedCount > 0) saveData();

            return { success: true, deletedCount };
        },

        getCategories() { return [...categories]; },

        addCategory(categoryData) {
            const maxCategories = Config.get('limits.maxCategories', 20);
            if (categories.length >= maxCategories) return { success: false, errors: [`分类数量已达上限 (${maxCategories})`] };

            if (!categoryData.name || !categoryData.name.trim()) return { success: false, errors: ['分类名称不能为空'] };

            const category = {
                id: Utils.generateId(),
                name: categoryData.name.trim(),
                color: categoryData.color || '#4f8cff'
            };

            categories.push(category);
            Storage.set('categories', categories);

            return { success: true, data: category };
        },

        deleteCategory(categoryId) {
            links.forEach(link => {
                if (link.categoryId === categoryId) link.categoryId = 'default';
            });

            categories = categories.filter(c => c.id !== categoryId);
            saveData();

            return { success: true };
        },

        setEditingId(id) { editingId = id; },
        getEditingId() { return editingId; },
        getEditingLink() { return editingId ? links.find(l => l.id === editingId) : undefined; },

        subscribe(callback) { listeners.add(callback); },
        unsubscribe(callback) { listeners.delete(callback); },

        reload() {
            loadData();
            notifyListeners();
        },

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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinkManager;
}
