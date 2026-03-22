"use strict";
/**
 * 请求日志中间件
 * 记录所有 HTTP 请求
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
/**
 * 请求日志中间件
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    // 请求完成后记录日志
    res.on('finish', () => {
        const duration = Date.now() - start;
        const log = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        };
        // 根据状态码使用不同的日志级别
        if (res.statusCode >= 500) {
            console.error('[Request]', log);
        }
        else if (res.statusCode >= 400) {
            console.warn('[Request]', log);
        }
        else {
            console.log('[Request]', log);
        }
    });
    next();
}
//# sourceMappingURL=logger.js.map