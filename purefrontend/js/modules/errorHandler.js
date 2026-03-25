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
            message: error.message || '发生未知错误',
            stack: error.stack,
            timestamp: new Date().toISOString(),
            context: context
        };

        console.error('[StudyHub Error]', errorInfo);

        if (handlers.has(errorInfo.type)) {
            handlers.get(errorInfo.type).forEach(handler => {
                try {
                    handler(errorInfo);
                } catch (e) {
                    console.error('错误处理器执行失败:', e);
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

        wrap(fn, context = {}) {
            return function(...args) {
                try {
                    const result = fn.apply(this, args);
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

        on(type, handler) {
            if (!handlers.has(type)) {
                handlers.set(type, new Set());
            }
            handlers.get(type).add(handler);
        },

        off(type, handler) {
            if (handlers.has(type)) {
                handlers.get(type).delete(handler);
            }
        },

        create(type, message, details = {}) {
            const error = new Error(message);
            error.type = type;
            error.details = details;
            return error;
        },

        safeExecute(fn, defaultValue = null, context = {}) {
            try {
                return fn();
            } catch (error) {
                handleError(error, context);
                return defaultValue;
            }
        },

        initGlobalListener() {
            window.addEventListener('unhandledrejection', (event) => {
                handleError(event.reason, { source: 'unhandledrejection' });
            });

            window.addEventListener('error', (event) => {
                handleError(event.error, { 
                    source: 'window.onerror',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            });
        }
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}
