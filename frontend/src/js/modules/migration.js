/**
 * StudyHub 数据迁移工具
 * 处理本地数据检测、导入导出和云端同步
 * @module Migration
 */

const Migration = (function() {
    'use strict';

    // API 基础 URL
    const API_BASE_URL = 'http://121.199.45.201:3000/api/v1';

    // =============================================
    // 本地数据检测
    // =============================================

    /**
     * 检测本地是否存在数据
     * @returns {boolean}
     */
    function detectLocalData() {
        const links = localStorage.getItem('studyhub_links');
        const tasks = localStorage.getItem('studyhub_tasks');
        const categories = localStorage.getItem('studyhub_categories');
        
        return !!(links || tasks || categories);
    }

    /**
     * 获取本地数据统计
     * @returns {Object}
     */
    function getLocalDataStats() {
        const stats = {
            links: { count: 0, size: 0 },
            tasks: { count: 0, size: 0 },
            categories: { count: 0, size: 0 }
        };

        const links = localStorage.getItem('studyhub_links');
        const tasks = localStorage.getItem('studyhub_tasks');
        const categories = localStorage.getItem('studyhub_categories');

        if (links) {
            const data = JSON.parse(links);
            stats.links.count = Array.isArray(data) ? data.length : 0;
            stats.links.size = new Blob([links]).size;
        }

        if (tasks) {
            const data = JSON.parse(tasks);
            stats.tasks.count = Array.isArray(data) ? data.length : 0;
            stats.tasks.size = new Blob([tasks]).size;
        }

        if (categories) {
            const data = JSON.parse(categories);
            stats.categories.count = Array.isArray(data) ? data.length : 0;
            stats.categories.size = new Blob([categories]).size;
        }

        return stats;
    }

    /**
     * 获取本地数据最后修改时间
     * @returns {string|null}
     */
    function getLastModified() {
        const timestamps = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('studyhub_')) {
                // 这里简化处理，实际应该存储修改时间
                timestamps.push(Date.now());
            }
        }

        return timestamps.length > 0 
            ? new Date(Math.max(...timestamps)).toISOString() 
            : null;
    }

    /**
     * 获取完整的本地数据检测信息
     * @returns {Object}
     */
    function getLocalDataInfo() {
        return {
            hasLocalData: detectLocalData(),
            stats: getLocalDataStats(),
            lastModified: getLastModified()
        };
    }

    // =============================================
    // 数据格式转换
    // =============================================

    /**
     * 将前端 camelCase 数据转换为后端 snake_case 格式
     * @param {Object} data - 前端数据
     * @returns {Object} - 后端格式数据
     */
    function convertToBackendFormat(data) {
        const result = {
            version: '2.0',
            exported_at: new Date().toISOString(),
            data: {
                categories: [],
                links: [],
                tasks: []
            }
        };

        // 转换分类
        if (data.categories) {
            result.data.categories = data.categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                color: cat.color,
                icon: cat.icon,
                sort_order: cat.sortOrder || 0,
                created_at: cat.createdAt,
                updated_at: cat.updatedAt
            }));
        }

        // 转换链接（name -> title）
        if (data.links) {
            result.data.links = data.links.map(link => ({
                id: link.id,
                title: link.name,
                url: link.url,
                description: link.description || '',
                category_id: link.categoryId === 'default' ? null : link.categoryId,
                is_pinned: link.pinned || false,
                pinned_at: link.pinnedAt ? new Date(link.pinnedAt).toISOString() : null,
                click_count: link.clickCount || 0,
                created_at: link.createdAt,
                updated_at: link.updatedAt
            }));
        }

        // 转换任务（time -> deadline）
        if (data.tasks) {
            result.data.tasks = data.tasks.map(task => ({
                id: task.id,
                name: task.name,
                description: task.description || '',
                deadline: task.time,
                priority: task.priority || 'medium',
                is_completed: task.completed || false,
                completed_at: task.completedAt,
                links: task.links || [],
                created_at: task.createdAt,
                updated_at: task.updatedAt
            }));
        }

        return result;
    }

    /**
     * 将后端格式数据转换为前端格式
     * @param {Object} data - 后端数据
     * @returns {Object} - 前端格式数据
     */
    function convertToFrontendFormat(data) {
        const result = {
            categories: [],
            links: [],
            tasks: []
        };

        const sourceData = data.data || data;

        // 转换分类
        if (sourceData.categories) {
            result.categories = sourceData.categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                color: cat.color || '#4f8cff',
                icon: cat.icon,
                sortOrder: cat.sort_order || 0,
                createdAt: cat.created_at,
                updatedAt: cat.updated_at
            }));
        }

        // 转换链接（title -> name）
        if (sourceData.links) {
            result.links = sourceData.links.map(link => ({
                id: link.id,
                name: link.title,
                url: link.url,
                description: link.description,
                categoryId: link.category_id || 'default',
                pinned: link.is_pinned,
                pinnedAt: link.pinned_at ? new Date(link.pinned_at).getTime() : null,
                clickCount: link.click_count || 0,
                createdAt: link.created_at,
                updatedAt: link.updated_at
            }));
        }

        // 转换任务（deadline -> time）
        if (sourceData.tasks) {
            result.tasks = sourceData.tasks.map(task => ({
                id: task.id,
                name: task.name,
                description: task.description,
                time: task.deadline,
                priority: task.priority,
                completed: task.is_completed,
                completedAt: task.completed_at,
                links: task.links || [],
                createdAt: task.created_at,
                updatedAt: task.updated_at
            }));
        }

        return result;
    }

    /**
     * 检测数据版本
     * @param {Object} data - 导入数据
     * @returns {string} - 版本号
     */
    function detectVersion(data) {
        if (data.version) return data.version;
        // v1.x 数据特征：links 数组中的对象有 name 字段
        if (data.links && data.links.length > 0 && data.links[0].name) return '1.x';
        if (data.data?.links && data.data.links.length > 0 && data.data.links[0].title) return '2.0';
        return 'unknown';
    }

    // =============================================
    // API 请求
    // =============================================

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

            return data;
        } catch (e) {
            console.error('[Migration] API 请求失败:', url, e);
            throw e;
        }
    }

    // =============================================
    // 云端数据操作
    // =============================================

    /**
     * 导出云端数据
     * @param {string} format - 导出格式
     * @returns {Promise<Object>}
     */
    async function exportFromCloud(format = 'json') {
        return apiRequest(`/data/export?format=${format}`);
    }

    /**
     * 导入数据到云端
     * @param {Object} data - 要导入的数据
     * @param {string} strategy - 冲突处理策略
     * @returns {Promise<Object>}
     */
    async function importToCloud(data, strategy = 'merge') {
        return apiRequest('/data/import', {
            method: 'POST',
            body: JSON.stringify({ data, strategy })
        });
    }

    /**
     * 上传本地数据到云端
     * @param {string} strategy - 冲突处理策略 (merge/overwrite)
     * @returns {Promise<Object>}
     */
    async function uploadToCloud(strategy = 'merge') {
        // 获取本地数据
        const localData = {
            links: JSON.parse(localStorage.getItem('studyhub_links') || '[]'),
            tasks: JSON.parse(localStorage.getItem('studyhub_tasks') || '[]'),
            categories: JSON.parse(localStorage.getItem('studyhub_categories') || '[]')
        };

        // 转换为后端格式
        const backendData = convertToBackendFormat(localData);

        // 上传到云端
        return importToCloud(backendData, strategy);
    }

    /**
     * 从云端下载数据到本地
     * @returns {Promise<Object>}
     */
    async function downloadFromCloud() {
        const response = await exportFromCloud('json');
        
        if (response.success && response.data) {
            // 转换为前端格式
            const frontendData = convertToFrontendFormat(response.data);
            
            // 保存到本地存储
            localStorage.setItem('studyhub_links', JSON.stringify(frontendData.links));
            localStorage.setItem('studyhub_tasks', JSON.stringify(frontendData.tasks));
            localStorage.setItem('studyhub_categories', JSON.stringify(frontendData.categories));
            
            return {
                success: true,
                data: frontendData,
                message: '数据下载成功'
            };
        }

        return {
            success: false,
            message: '数据下载失败'
        };
    }

    // =============================================
    // 本地数据导出
    // =============================================

    /**
     * 导出本地数据为文件
     * @param {string} format - 导出格式 (json/csv)
     * @param {string} version - 目标版本格式 (1.x/2.0)
     * @returns {Object}
     */
    function exportLocalData(format = 'json', version = '2.0') {
        const localData = {
            links: JSON.parse(localStorage.getItem('studyhub_links') || '[]'),
            tasks: JSON.parse(localStorage.getItem('studyhub_tasks') || '[]'),
            categories: JSON.parse(localStorage.getItem('studyhub_categories') || '[]')
        };

        let exportData;

        if (version === '2.0') {
            exportData = convertToBackendFormat(localData);
        } else {
            // v1.x 格式
            exportData = {
                version: '1.x',
                exported_at: new Date().toISOString(),
                ...localData
            };
        }

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `studyhub-export-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        return {
            success: true,
            data: exportData,
            message: '导出成功'
        };
    }

    /**
     * 导入本地数据文件
     * @param {File} file - 导入的文件
     * @param {string} strategy - 冲突处理策略
     * @returns {Promise<Object>}
     */
    async function importLocalFile(file, strategy = 'merge') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const version = detectVersion(data);

                    if (version === 'unknown') {
                        reject(new Error('无法识别的数据格式'));
                        return;
                    }

                    // 转换为前端格式
                    let frontendData;
                    if (version === '2.0') {
                        frontendData = convertToFrontendFormat(data);
                    } else {
                        // v1.x 数据直接使用
                        frontendData = {
                            links: data.links || [],
                            tasks: data.tasks || [],
                            categories: data.categories || []
                        };
                    }

                    // 应用导入策略
                    if (strategy === 'overwrite') {
                        localStorage.setItem('studyhub_links', JSON.stringify(frontendData.links));
                        localStorage.setItem('studyhub_tasks', JSON.stringify(frontendData.tasks));
                        localStorage.setItem('studyhub_categories', JSON.stringify(frontendData.categories));
                    } else {
                        // merge 策略
                        const existingLinks = JSON.parse(localStorage.getItem('studyhub_links') || '[]');
                        const existingTasks = JSON.parse(localStorage.getItem('studyhub_tasks') || '[]');
                        const existingCategories = JSON.parse(localStorage.getItem('studyhub_categories') || '[]');

                        // 合并数据（根据 ID 去重）
                        const mergeArrays = (existing, incoming) => {
                            const map = new Map(existing.map(item => [item.id, item]));
                            incoming.forEach(item => {
                                if (!map.has(item.id)) {
                                    map.set(item.id, item);
                                }
                            });
                            return Array.from(map.values());
                        };

                        localStorage.setItem('studyhub_links', JSON.stringify(mergeArrays(existingLinks, frontendData.links)));
                        localStorage.setItem('studyhub_tasks', JSON.stringify(mergeArrays(existingTasks, frontendData.tasks)));
                        localStorage.setItem('studyhub_categories', JSON.stringify(mergeArrays(existingCategories, frontendData.categories)));
                    }

                    resolve({
                        success: true,
                        version: version,
                        message: '导入成功',
                        stats: {
                            links: frontendData.links.length,
                            tasks: frontendData.tasks.length,
                            categories: frontendData.categories.length
                        }
                    });
                } catch (error) {
                    reject(new Error('文件解析失败: ' + error.message));
                }
            };

            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };

            reader.readAsText(file);
        });
    }

    // =============================================
    // 公共 API
    // =============================================

    return {
        // 本地数据检测
        detectLocalData,
        getLocalDataStats,
        getLocalDataInfo,

        // 数据格式转换
        convertToBackendFormat,
        convertToFrontendFormat,
        detectVersion,

        // 云端操作
        exportFromCloud,
        importToCloud,
        uploadToCloud,
        downloadFromCloud,

        // 本地导入导出
        exportLocalData,
        importLocalFile,
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Migration;
}
