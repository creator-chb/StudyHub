"use strict";
/**
 * 错误处理中间件
 * 统一处理所有错误
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = createError;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
/**
 * 创建错误对象
 */
function createError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
}
/**
 * 全局错误处理中间件
 */
function errorHandler(err, req, res, _next) {
    console.error('[Error]', err.message, err.stack);
    const status = err.status || 500;
    const message = status === 500 ? '服务器内部错误' : err.message;
    res.status(status).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}
/**
 * 404 处理中间件
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        message: `路由 ${req.method} ${req.path} 不存在`,
    });
}
//# sourceMappingURL=errorHandler.js.map