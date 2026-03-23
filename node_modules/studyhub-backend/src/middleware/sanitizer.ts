/**
 * 输入清理中间件
 * 清理和规范化请求输入，防止注入攻击
 */

import { Request, Response, NextFunction } from 'express';

/**
 * 递归清理对象中的字符串值
 * @param value - 要清理的值
 * @returns 清理后的值
 */
function sanitizeValue(value: unknown): unknown {
    if (typeof value === 'string') {
        return sanitizeString(value);
    }
    
    if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item));
    }
    
    if (value !== null && typeof value === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            sanitized[sanitizeString(key) as string] = sanitizeValue(val);
        }
        return sanitized;
    }
    
    return value;
}

/**
 * 清理字符串
 * @param str - 要清理的字符串
 * @returns 清理后的字符串
 */
function sanitizeString(str: string): string {
    // 移除控制字符（保留换行和制表符）
    let sanitized = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // 规范化空白字符
    sanitized = sanitized.trim();
    
    // 移除潜在的脚本注入
    sanitized = sanitized
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    
    return sanitized;
}

/**
 * 清理请求体的中间件
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body);
    }
    next();
}

/**
 * 清理查询参数的中间件
 */
export function sanitizeQuery(req: Request, _res: Response, next: NextFunction): void {
    if (req.query && typeof req.query === 'object') {
        for (const [key, value] of Object.entries(req.query)) {
            if (typeof value === 'string') {
                req.query[key] = sanitizeString(value);
            }
        }
    }
    next();
}

/**
 * 清理 URL 参数的中间件
 */
export function sanitizeParams(req: Request, _res: Response, next: NextFunction): void {
    if (req.params && typeof req.params === 'object') {
        for (const [key, value] of Object.entries(req.params)) {
            if (typeof value === 'string') {
                req.params[key] = sanitizeString(value);
            }
        }
    }
    next();
}

/**
 * 综合清理中间件
 */
export function sanitizeAll(req: Request, res: Response, next: NextFunction): void {
    sanitizeBody(req, res, () => {
        sanitizeQuery(req, res, () => {
            sanitizeParams(req, res, next);
        });
    });
}

/**
 * 移除对象中的敏感字段
 * @param obj - 要处理的对象
 * @param fields - 要移除的字段列表
 * @returns 处理后的对象
 */
export function removeSensitiveFields<T extends Record<string, unknown>>(
    obj: T,
    fields: string[] = ['password', 'password_hash', 'token', 'secret', 'apiKey']
): Partial<T> {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (!fields.includes(key.toLowerCase())) {
            result[key] = value;
        }
    }
    
    return result as Partial<T>;
}

export default {
    sanitizeBody,
    sanitizeQuery,
    sanitizeParams,
    sanitizeAll,
    sanitizeString,
    removeSensitiveFields,
};
