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
        UNKNOWN: 'UNKNOWN'
    };

    /**
     * 错误处理器集合
     * @type {Map}
     */
    const handlers = new Map();

    /**
     * 全局错误处理器
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     */
    function handleError(error, context = {}) {
        const errorInfo = {
            type: context.type || ErrorTypes.UNKNOWN,
            message: error.message || '未知错误',
            stack: error.stack,
            timestamp: new Date().toISOString(),
            context: context
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
                    type: ErrorTypes.UNKNOWN, 
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
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}
