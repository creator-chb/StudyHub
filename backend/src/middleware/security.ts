/**
 * 安全中间件
 * 添加安全相关的 HTTP 响应头
 */

import { Request, Response, NextFunction } from 'express';
import config from '../config/index.js';

/**
 * Content Security Policy 配置
 */
const cspDirectives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"], // unsafe-inline 用于内联脚本
    'style-src': ["'self'", "'unsafe-inline'"], // unsafe-inline 用于内联样式
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", config.frontendUrl],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
};

/**
 * 生成 CSP 头值
 */
function generateCSP(): string {
    return Object.entries(cspDirectives)
        .map(([directive, values]) => `${directive} ${values.join(' ')}`)
        .join('; ');
}

/**
 * 安全响应头中间件
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
    // Content Security Policy
    res.setHeader('Content-Security-Policy', generateCSP());
    
    // 防止 MIME 类型嗅探
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // 防止点击劫持
    res.setHeader('X-Frame-Options', 'DENY');
    
    // XSS 保护
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // 引用策略
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // 权限策略
    res.setHeader('Permissions-Policy', 
        'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()');
    
    // HTTP Strict Transport Security (仅在生产环境启用 HTTPS)
    if (config.nodeEnv === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // 移除可能暴露服务器信息的头
    res.removeHeader('X-Powered-By');
    
    next();
}

/**
 * CORS 安全配置中间件
 * 与现有的 cors 中间件配合使用
 */
export function corsSecurityOptions() {
    return {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            // 允许无 origin 的请求（如移动应用、Postman）
            if (!origin) {
                callback(null, true);
                return;
            }
            
            // 检查允许的来源
            const allowedOrigins = [config.frontendUrl];
            if (config.nodeEnv === 'development') {
                // 开发环境允许 localhost
                allowedOrigins.push('http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080');
            }
            
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.warn(`[Security] 拒绝来自 ${origin} 的 CORS 请求`);
                callback(new Error('不允许的 CORS 来源'), false);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
        exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
        maxAge: 86400, // 24 小时
    };
}

/**
 * 检测可疑请求模式
 */
export function detectSuspiciousRequest(req: Request, res: Response, next: NextFunction): void {
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /union\s+select/i,
        /insert\s+into/i,
        /delete\s+from/i,
        /drop\s+table/i,
        /exec\s*\(/i,
        /eval\s*\(/i,
    ];
    
    const checkValue = (value: unknown): boolean => {
        if (typeof value === 'string') {
            return suspiciousPatterns.some(pattern => pattern.test(value));
        }
        if (Array.isArray(value)) {
            return value.some(checkValue);
        }
        if (value && typeof value === 'object') {
            return Object.values(value).some(checkValue);
        }
        return false;
    };
    
    // 检查请求体、查询参数和 URL 参数
    const hasSuspiciousContent = 
        checkValue(req.body) || 
        checkValue(req.query) || 
        checkValue(req.params);
    
    if (hasSuspiciousContent) {
        console.warn(`[Security] 检测到可疑请求: ${req.method} ${req.url}`);
        res.status(400).json({
            success: false,
            message: '请求包含不允许的内容',
        });
        return;
    }
    
    next();
}

export default {
    securityHeaders,
    corsSecurityOptions,
    detectSuspiciousRequest,
};
