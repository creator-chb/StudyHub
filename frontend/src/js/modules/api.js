/**
 * StudyHub API 客户端模块
 * 封装后端 API 调用，提供请求拦截器和响应拦截器
 * @module api
 */

const ApiClient = (function() {
    'use strict';

    // API 基础配置
    const API_BASE_URL = 'http://localhost:3000/api/v1';
    const AUTH_BASE_URL = 'http://localhost:3000/api';

    // Token 存储键名
    const ACCESS_TOKEN_KEY = 'studyhub_access_token';
    const REFRESH_TOKEN_KEY = 'studyhub_refresh_token';
    const USER_KEY = 'studyhub_user';

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
     * 发送 API 请求
     * @param {string} endpoint - API 端点
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} 响应数据
     */
    async function request(endpoint, options = {}) {
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

            // 处理 401 未授权错误，尝试刷新令牌
            if (response.status === 401 && token) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    // 重新发送请求
                    headers['Authorization'] = `Bearer ${getAccessToken()}`;
                    const retryResponse = await fetch(url, {
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

            return handleResponse(response);
        } catch (error) {
            console.error('[API] 请求错误:', error);
            throw error;
        }
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
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}
