/**
 * StudyHub 错误处理模块
 * 统一错误捕获、处理和用户反馈
 * @module ErrorHandler
 */

const ErrorHandler = (function() {
    'use strict';

    /**
     * 错误类型定义
     * @type {Object}
     */
    const ErrorTypes = {
        VALIDATION: 'VALIDATION',
        STORAGE: 'STORAGE',
        NETWORK: 'NETWORK',
        RENDER: 'RENDER',
        AUTH: 'AUTH',
        TIMEOUT: 'TIMEOUT',
        OFFLINE: 'OFFLINE',
        UNKNOWN: 'UNKNOWN'
    };

    /**
     * 网络错误代码映射
     * @type {Object}
     */
    const NetworkErrorMessages = {
        'OFFLINE': '网络连接已断开，请检查您的网络设置',
        'NETWORK_ERROR': '网络连接失败，请检查网络设置',
        'TIMEOUT': '请求超时，请稍后重试',
        'ERR_INTERNET_DISCONNECTED': '互联网连接已断开',
        'ERR_CONNECTION_REFUSED': '无法连接到服务器',
        'ERR_CONNECTION_RESET': '连接被重置',
        'ERR_NAME_NOT_RESOLVED': '无法解析服务器地址',
        '401': '登录已过期，请重新登录',
        '403': '没有权限执行此操作',
        '404': '请求的资源不存在',
        '429': '请求过于频繁，请稍后再试',
        '500': '服务器内部错误，请稍后再试',
        '502': '服务器网关错误',
        '503': '服务暂时不可用',
        '504': '服务器网关超时'
    };

    /**
     * 错误处理器集合
     * @type {Map}
     */
    const handlers = new Map();

    /**
     * 网络状态监听器
     * @type {Set}
     */
    const networkListeners = new Set();

    /**
     * 是否在线
     * @type {boolean}
     */
    let isOnline = navigator.onLine !== false;

    /**
     * 全局错误处理器
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     */
    function handleError(error, context = {}) {
        const errorInfo = {
            type: context.type || classifyError(error),
            message: getErrorMessage(error),
            stack: error.stack,
            timestamp: new Date().toISOString(),
            context: context,
            code: error.code || error.status,
            retryable: isRetryable(error)
        };

        // 记录到控制台
        console.error('[StudyHub Error]', errorInfo);

        // 调用特定类型处理器
        if (handlers.has(errorInfo.type)) {
            handlers.get(errorInfo.type).forEach(handler => {
                try {
                    handler(errorInfo);
                } catch (e) {
                    console.error('错误处理器执行失败:', e);
                }
            });
        }

        // 调用通用处理器
        if (handlers.has('ALL')) {
            handlers.get('ALL').forEach(handler => {
                try {
                    handler(errorInfo);
                } catch (e) {
                    console.error('通用错误处理器执行失败:', e);
                }
            });
        }

        return errorInfo;
    }

    /**
     * 分类错误类型
     * @private
     * @param {Error} error - 错误对象
     * @returns {string} 错误类型
     */
    function classifyError(error) {
        if (error.code === 'OFFLINE' || !navigator.onLine) {
            return ErrorTypes.OFFLINE;
        }
        if (error.code === 'TIMEOUT' || error.name === 'AbortError') {
            return ErrorTypes.TIMEOUT;
        }
        if (error.code === 'NETWORK_ERROR' || error.name === 'TypeError') {
            return ErrorTypes.NETWORK;
        }
        if (error.status === 401) {
            return ErrorTypes.AUTH;
        }
        if (error.type) {
            return error.type;
        }
        return ErrorTypes.UNKNOWN;
    }

    /**
     * 获取用户友好的错误消息
     * @private
     * @param {Error} error - 错误对象
     * @returns {string} 错误消息
     */
    function getErrorMessage(error) {
        // 检查网络错误代码
        if (error.code && NetworkErrorMessages[error.code]) {
            return NetworkErrorMessages[error.code];
        }
        // 检查 HTTP 状态码
        if (error.status && NetworkErrorMessages[String(error.status)]) {
            return NetworkErrorMessages[String(error.status)];
        }
        // 检查错误消息中的关键词
        const message = error.message || '';
        if (message.includes('fetch')) {
            return NetworkErrorMessages.NETWORK_ERROR;
        }
        if (message.includes('timeout') || message.includes('超时')) {
            return NetworkErrorMessages.TIMEOUT;
        }
        return message || '发生未知错误';
    }

    /**
     * 判断错误是否可重试
     * @private
     * @param {Error} error - 错误对象
     * @returns {boolean}
     */
    function isRetryable(error) {
        const retryableCodes = ['TIMEOUT', 'NETWORK_ERROR', '502', '503', '504'];
        const retryableStatus = [502, 503, 504, 408, 429];
        
        return retryableCodes.includes(error.code) ||
               retryableStatus.includes(error.status) ||
               error.name === 'AbortError' ||
               error.name === 'TypeError';
    }

    /**
     * 处理网络错误（显示 Toast 并提供重试选项）
     * @param {Error} error - 错误对象
     * @param {Function} retryFn - 重试函数
     * @param {Object} options - 选项
     */
    function handleNetworkError(error, retryFn, options = {}) {
        const errorInfo = handleError(error, { type: ErrorTypes.NETWORK });
        
        if (typeof Toast !== 'undefined') {
            const toast = Toast.show(errorInfo.message, 'error', 5000);
            
            // 如果可重试，添加重试按钮
            if (errorInfo.retryable && retryFn) {
                const retryBtn = document.createElement('button');
                retryBtn.className = 'toast-retry-btn';
                retryBtn.textContent = '重试';
                retryBtn.onclick = () => {
                    Toast.dismiss(toast);
                    retryFn();
                };
                toast.querySelector('.toast-message').after(retryBtn);
            }
        }
        
        return errorInfo;
    }

    /**
     * 检查网络状态
     * @returns {boolean}
     */
    function checkOnline() {
        return navigator.onLine !== false;
    }

    /**
     * 订阅网络状态变化
     * @param {Function} callback - 回调函数
     */
    function onNetworkChange(callback) {
        networkListeners.add(callback);
    }

    /**
     * 取消订阅网络状态变化
     * @param {Function} callback - 回调函数
     */
    function offNetworkChange(callback) {
        networkListeners.delete(callback);
    }

    /**
     * 通知网络状态变化
     * @private
     * @param {boolean} online - 是否在线
     */
    function notifyNetworkChange(online) {
        networkListeners.forEach(callback => {
            try {
                callback(online);
            } catch (e) {
                console.error('[ErrorHandler] 网络状态监听器错误:', e);
            }
        });
    }

    /**
     * 错误处理模块公共 API
     */
    return {
        ErrorTypes,

        /**
         * 包装函数，自动捕获错误
         * @param {Function} fn - 要包装的函数
         * @param {Object} context - 错误上下文
         * @returns {Function} 包装后的函数
         */
        wrap(fn, context = {}) {
            return function(...args) {
                try {
                    const result = fn.apply(this, args);
                    // 处理 Promise
                    if (result && typeof result.then === 'function') {
                        return result.catch(error => {
                            handleError(error, context);
                            throw error;
                        });
                    }
                    return result;
                } catch (error) {
                    handleError(error, context);
                    throw error;
                }
            };
        },

        /**
         * 注册错误处理器
         * @param {string} type - 错误类型
         * @param {Function} handler - 处理函数
         */
        on(type, handler) {
            if (!handlers.has(type)) {
                handlers.set(type, new Set());
            }
            handlers.get(type).add(handler);
        },

        /**
         * 移除错误处理器
         * @param {string} type - 错误类型
         * @param {Function} handler - 处理函数
         */
        off(type, handler) {
            if (handlers.has(type)) {
                handlers.get(type).delete(handler);
            }
        },

        /**
         * 创建业务错误
         * @param {string} type - 错误类型
         * @param {string} message - 错误消息
         * @param {Object} details - 详细信息
         * @returns {Error} 错误对象
         */
        create(type, message, details = {}) {
            const error = new Error(message);
            error.type = type;
            error.details = details;
            return error;
        },

        /**
         * 验证错误处理
         * @param {boolean} condition - 验证条件
         * @param {string} message - 错误消息
         * @param {Object} details - 详细信息
         */
        assert(condition, message, details = {}) {
            if (!condition) {
                const error = this.create(ErrorTypes.VALIDATION, message, details);
                handleError(error, { type: ErrorTypes.VALIDATION });
                throw error;
            }
        },

        /**
         * 安全执行函数
         * @param {Function} fn - 要执行的函数
         * @param {*} defaultValue - 失败时的默认值
         * @param {Object} context - 错误上下文
         * @returns {*} 执行结果或默认值
         */
        safeExecute(fn, defaultValue = null, context = {}) {
            try {
                return fn();
            } catch (error) {
                handleError(error, context);
                return defaultValue;
            }
        },

        /**
         * 初始化全局错误监听
         */
        initGlobalListener() {
            // 监听未捕获的 Promise 错误
            window.addEventListener('unhandledrejection', (event) => {
                handleError(event.reason, { 
                    type: classifyError(event.reason), 
                    source: 'unhandledrejection' 
                });
            });

            // 监听全局错误
            window.addEventListener('error', (event) => {
                handleError(event.error, { 
                    type: ErrorTypes.UNKNOWN, 
                    source: 'window.onerror',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            });

            // 监听网络状态变化
            window.addEventListener('online', () => {
                isOnline = true;
                notifyNetworkChange(true);
                if (typeof Toast !== 'undefined') {
                    Toast.show('网络已恢复连接', 'success');
                }
            });

            window.addEventListener('offline', () => {
                isOnline = false;
                notifyNetworkChange(false);
                if (typeof Toast !== 'undefined') {
                    Toast.show('网络连接已断开', 'warning');
                }
            });
        },

        /**
         * 处理网络错误
         */
        handleNetworkError,

        /**
         * 检查网络状态
         */
        checkOnline,

        /**
         * 获取当前网络状态
         * @returns {boolean}
         */
        isOnline() {
            return isOnline;
        },

        /**
         * 订阅网络状态变化
         */
        onNetworkChange,

        /**
         * 取消订阅网络状态变化
         */
        offNetworkChange,

        /**
         * 获取网络错误消息映射
         */
        NetworkErrorMessages
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}
