/**
 * 请求日志中间件
 * 记录所有 HTTP 请求（敏感数据已脱敏）
 */

import { Request, Response, NextFunction } from 'express';
import { maskSensitiveData, maskEmail } from '../utils/encryption.js';

/**
 * 敏感字段列表（用于日志脱敏）
 */
const SENSITIVE_FIELDS = [
    'password',
    'password_hash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'authorization',
];

/**
 * 脱敏请求体
 * @param body - 请求体
 * @returns {Object} 脱敏后的请求体
 */
function sanitizeBody(body: unknown): unknown {
    return maskSensitiveData(body);
}

/**
 * 脱敏 URL（移除敏感查询参数）
 * @param url - URL 字符串
 * @returns {string} 脱敏后的 URL
 */
function sanitizeUrl(url: string): string {
    try {
        const urlObj = new URL(url, 'http://localhost');
        const params = new URLSearchParams();
        
        for (const [key, value] of urlObj.searchParams) {
            const lowerKey = key.toLowerCase();
            const isSensitive = SENSITIVE_FIELDS.some(field => 
                lowerKey.includes(field.toLowerCase())
            );
            
            if (isSensitive) {
                params.set(key, '***');
            } else {
                params.set(key, value);
            }
        }
        
        urlObj.search = params.toString();
        return urlObj.pathname + (params.toString() ? '?' + params.toString() : '');
    } catch {
        return url;
    }
}

/**
 * 请求日志中间件
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    // 请求完成后记录日志
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        // 脱敏处理
        const sanitizedUrl = sanitizeUrl(req.url);
        const sanitizedBody = req.body ? sanitizeBody(req.body) : undefined;
        
        const log = {
            method: req.method,
            url: sanitizedUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip ? maskString(req.ip, 8) : undefined,
            userAgent: req.get('user-agent'),
            // 仅在开发环境记录请求体
            ...(process.env.NODE_ENV === 'development' && req.method !== 'GET' && { body: sanitizedBody }),
        };

        // 根据状态码使用不同的日志级别
        if (res.statusCode >= 500) {
            console.error('[Request]', JSON.stringify(log));
        } else if (res.statusCode >= 400) {
            console.warn('[Request]', JSON.stringify(log));
        } else {
            console.log('[Request]', JSON.stringify(log));
        }
    });

    next();
}

/**
 * 脱敏字符串
 * @param str - 要脱敏的字符串
 * @param visibleChars - 可见字符数
 * @returns {string} 脱敏后的字符串
 */
function maskString(str: string, visibleChars: number = 4): string {
    if (!str || str.length <= visibleChars) {
        return '***';
    }
    return str.substring(0, visibleChars) + '*'.repeat(Math.min(str.length - visibleChars, 10));
}
