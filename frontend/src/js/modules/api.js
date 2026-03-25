/**
 * StudyHub API 客户端模块
 * 封装后端 API 调用，提供请求拦截器和响应拦截器
 * @module api
 */

const ApiClient = (function() {
    'use strict';

    // API 基础配置
    const API_BASE_URL = 'http://121.199.45.201:3000/api/v1';
    const AUTH_BASE_URL = 'http://121.199.45.201:3000/api';

    // Token 存储键名
    const ACCESS_TOKEN_KEY = 'studyhub_access_token';
    const REFRESH_TOKEN_KEY = 'studyhub_refresh_token';
    const USER_KEY = 'studyhub_user';

    // 请求配置
    const DEFAULT_TIMEOUT = 30000; // 30 秒超时
    const MAX_RETRIES = 2; // 最大重试次数
    const RETRY_DELAY = 1000; // 重试延迟（毫秒）

    // 请求队列（用于追踪活动请求）
    const activeRequests = new Map();
    let requestIdCounter = 0;

    // CSRF Token 缓存
    let csrfToken = null;

    // =============================================
    // Token 管理
    // =============================================

    /**
     * 获取访问令牌
     */
    function getAccessToken() {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    }

    /**
     * 设置访问令牌
     */
    function setAccessToken(token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
    }

    /**
     * 获取刷新令牌
     */
    function getRefreshToken() {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    }

    /**
     * 设置刷新令牌
     */
    function setRefreshToken(token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
    }

    /**
     * 清除所有令牌
     */
    function clearTokens() {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    /**
     * 保存用户信息
     */
    function setUser(user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    /**
     * 获取用户信息
     */
    function getUser() {
        const userStr = localStorage.getItem(USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    }

    /**
     * 检查是否已登录
     */
    function isAuthenticated() {
        return !!getAccessToken();
    }

    // =============================================
    // 请求发送
    // =============================================

    /**
     * 检查网络连接状态
     * @returns {boolean}
     */
    function isOnline() {
        return navigator.onLine !== false;
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise}
     */
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 创建带超时的 fetch 请求
     * @param {string} url - 请求 URL
     * @param {Object} options - 请求选项
     * @param {number} timeout - 超时时间
     * @returns {Promise<Response>}
     */
    function fetchWithTimeout(url, options, timeout = DEFAULT_TIMEOUT) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        return fetch(url, {
            ...options,
            signal: controller.signal,
        }).finally(() => {
            clearTimeout(timeoutId);
        });
    }

    /**
     * 发送 API 请求（带重试和加载状态）
     * @param {string} endpoint - API 端点
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} 响应数据
     */
    async function request(endpoint, options = {}) {
        const {
            showLoading = true,
            loadingText = '加载中...',
            retries = MAX_RETRIES,
            skipAuth = false,
        } = options;

        // 检查网络状态
        if (!isOnline()) {
            const error = new Error('网络连接已断开，请检查您的网络设置');
            error.code = 'OFFLINE';
            throw error;
        }

        // 显示加载状态
        if (showLoading && typeof Loading !== 'undefined') {
            Loading.showGlobal(loadingText);
        }

        const url = `${API_BASE_URL}${endpoint}`;
        const token = getAccessToken();

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token && !skipAuth) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // 生成请求 ID
        const requestId = ++requestIdCounter;
        activeRequests.set(requestId, { endpoint, startTime: Date.now() });

        let lastError = null;
        let attempt = 0;

        while (attempt <= retries) {
            try {
                const response = await fetchWithTimeout(url, {
                    ...options,
                    headers,
                });

                // 处理 401 未授权错误，尝试刷新令牌
                if (response.status === 401 && token && !skipAuth) {
                    const refreshed = await refreshToken();
                    if (refreshed) {
                        // 重新发送请求
                        headers['Authorization'] = `Bearer ${getAccessToken()}`;
                        const retryResponse = await fetchWithTimeout(url, {
                            ...options,
                            headers,
                        });
                        return handleResponse(retryResponse);
                    } else {
                        // 刷新失败，清除令牌
                        clearTokens();
                        window.location.reload();
                    }
                }

                activeRequests.delete(requestId);
                
                // 隐藏加载状态
                if (showLoading && typeof Loading !== 'undefined') {
                    Loading.hideGlobal();
                }

                return handleResponse(response);
            } catch (error) {
                lastError = error;
                attempt++;

                // 超时或网络错误时重试
                const isRetryable = 
                    error.name === 'AbortError' ||
                    error.name === 'TypeError' ||
                    error.message.includes('network') ||
                    error.message.includes('fetch');

                if (attempt <= retries && isRetryable) {
                    console.warn(`[API] 请求失败，正在重试 (${attempt}/${retries})...`, error.message);
                    await delay(RETRY_DELAY * attempt);
                } else {
                    break;
                }
            }
        }

        activeRequests.delete(requestId);
        
        // 隐藏加载状态
        if (showLoading && typeof Loading !== 'undefined') {
            Loading.hideGlobal();
        }

        // 处理错误
        if (lastError.name === 'AbortError') {
            const error = new Error('请求超时，请稍后重试');
            error.code = 'TIMEOUT';
            throw error;
        }

        if (lastError.name === 'TypeError' && lastError.message.includes('fetch')) {
            const error = new Error('网络连接失败，请检查网络设置');
            error.code = 'NETWORK_ERROR';
            throw error;
        }

        console.error('[API] 请求错误:', lastError);
        throw lastError;
    }

    /**
     * 处理响应
     */
    async function handleResponse(response) {
        const data = await response.json();

        if (!response.ok) {
            const error = new Error(data.message || '请求失败');
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    // =============================================
    // 认证操作
    // =============================================

    /**
     * 用户注册
     * @param {string} email - 邮箱
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @returns {Promise<Object>} 注册结果
     */
    async function register(email, username, password) {
        const response = await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, username, password }),
        });

        if (response.success) {
            setAccessToken(response.data.accessToken);
            setRefreshToken(response.data.refreshToken);
            setUser(response.data.user);
        }

        return response;
    }

    /**
     * 用户登录
     * @param {string} email - 邮箱
     * @param {string} password - 密码
     * @returns {Promise<Object>} 登录结果
     */
    async function login(email, password) {
        const response = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (response.success) {
            setAccessToken(response.data.accessToken);
            setRefreshToken(response.data.refreshToken);
            setUser(response.data.user);
        }

        return response;
    }

    /**
     * 用户登出
     * @returns {Promise<Object>} 登出结果
     */
    async function logout() {
        try {
            await request('/auth/logout', {
                method: 'POST',
            });
        } catch (e) {
            console.warn('[API] 登出请求失败:', e);
        } finally {
            clearTokens();
        }
    }

    /**
     * 刷新令牌
     * @returns {Promise<boolean>} 是否刷新成功
     */
    async function refreshToken() {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            return false;
        }

        try {
            const response = await fetch(`${AUTH_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
            });

            const data = await response.json();

            if (data.success) {
                setAccessToken(data.data.accessToken);
                setRefreshToken(data.data.refreshToken);
                return true;
            }
        } catch (e) {
            console.error('[API] 刷新令牌失败:', e);
        }

        return false;
    }

    /**
     * 获取当前用户信息
     * @returns {Promise<Object>} 用户信息
     */
    async function getCurrentUser() {
        return request('/auth/me');
    }

    // =============================================
    // CSRF Token 管理
    // =============================================

    /**
     * 从 Cookie 获取 CSRF Token
     * @returns {string|null}
     */
    function getCsrfTokenFromCookie() {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : null;
    }

    /**
     * 获取 CSRF Token
     * 如果本地没有，从服务器获取
     * @returns {Promise<string>}
     */
    async function fetchCsrfToken() {
        try {
            const response = await fetch(`${API_BASE_URL}/csrf-token`, {
                credentials: 'include',
            });
            const data = await response.json();
            if (data.success) {
                csrfToken = data.data.token;
                return csrfToken;
            }
        } catch (e) {
            console.error('[API] 获取 CSRF Token 失败:', e);
        }
        return null;
    }

    /**
     * 确保 CSRF Token 可用
     * @returns {Promise<string|null>}
     */
    async function ensureCsrfToken() {
        // 优先从 Cookie 获取（服务器设置的）
        const cookieToken = getCsrfTokenFromCookie();
        if (cookieToken) {
            csrfToken = cookieToken;
            return csrfToken;
        }
        
        // 如果没有，从服务器获取
        return fetchCsrfToken();
    }

    // =============================================
    // 分页数据获取
    // =============================================

    /**
     * 获取分页链接列表
     * @param {Object} options - 查询选项
     * @param {number} [options.page=1] - 页码
     * @param {number} [options.limit=20] - 每页数量
     * @param {string} [options.category_id] - 分类 ID
     * @param {boolean} [options.is_pinned] - 是否置顶
     * @param {string} [options.search] - 搜索关键词
     * @returns {Promise<Object>} 响应数据
     */
    async function getLinks(options = {}) {
        const { page = 1, limit = 20, ...filters } = options;
        const params = new URLSearchParams({ page, limit, ...filters });
        
        return request(`/links?${params}`, { showLoading: false });
    }

    /**
     * 获取分页任务列表
     * @param {Object} options - 查询选项
     * @param {number} [options.page=1] - 页码
     * @param {number} [options.limit=20] - 每页数量
     * @param {string} [options.status] - 状态过滤
     * @param {string} [options.priority] - 优先级过滤
     * @param {string} [options.search] - 搜索关键词
     * @returns {Promise<Object>} 响应数据
     */
    async function getTasks(options = {}) {
        const { page = 1, limit = 20, ...filters } = options;
        const params = new URLSearchParams({ page, limit, ...filters });
        
        return request(`/tasks?${params}`, { showLoading: false });
    }

    /**
     * 获取任务统计
     * @returns {Promise<Object>} 响应数据
     */
    async function getTaskStats() {
        return request('/tasks/stats', { showLoading: false });
    }

    /**
     * 获取分类列表
     * @returns {Promise<Object>} 响应数据
     */
    async function getCategories() {
        return request('/categories', { showLoading: false });
    }

    // =============================================
    // 公开 API
    // =============================================

    return {
        // 认证
        register,
        login,
        logout,
        refreshToken,
        getCurrentUser,

        // 状态
        isAuthenticated,
        getUser,
        getAccessToken,

        // 网络状态
        isOnline,

        // 请求配置
        request,

        // CSRF
        fetchCsrfToken,
        ensureCsrfToken,
        getCsrfToken: () => csrfToken || getCsrfTokenFromCookie(),

        // 分页数据
        getLinks,
        getTasks,
        getTaskStats,
        getCategories,
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}
