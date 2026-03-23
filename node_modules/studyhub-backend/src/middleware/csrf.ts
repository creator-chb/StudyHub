/**
 * CSRF 防护中间件
 * 使用 Double Submit Cookie 模式
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import config from '../config/index.js';

// CSRF Token 存储键前缀
const CSRF_TOKEN_PREFIX = 'csrf:';

// Token 有效期（1小时）
const TOKEN_EXPIRY = 60 * 60 * 1000;

/**
 * 生成 CSRF Token
 * @returns {string} CSRF Token
 */
function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * 验证 CSRF Token 格式
 * @param token - 要验证的 token
 * @returns {boolean} 是否有效
 */
function isValidTokenFormat(token: string): boolean {
    return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
}

/**
 * 创建带时间戳的 Token
 * @param token - 原始 token
 * @returns {string} 带时间戳的 token
 */
function createTimestampedToken(token: string): string {
    const timestamp = Date.now().toString(36);
    const hmac = crypto
        .createHmac('sha256', config.jwt.secret)
        .update(`${token}:${timestamp}`)
        .digest('hex')
        .substring(0, 16);
    return `${token}.${timestamp}.${hmac}`;
}

/**
 * 验证带时间戳的 Token
 * @param timestampedToken - 带时间戳的 token
 * @returns {Object} 验证结果
 */
function verifyTimestampedToken(timestampedToken: string): { valid: boolean; expired: boolean } {
    const parts = timestampedToken.split('.');
    if (parts.length !== 3) {
        return { valid: false, expired: false };
    }

    const [token, timestampStr, hmac] = parts;
    
    // 验证 HMAC
    const expectedHmac = crypto
        .createHmac('sha256', config.jwt.secret)
        .update(`${token}:${timestampStr}`)
        .digest('hex')
        .substring(0, 16);
    
    if (hmac !== expectedHmac) {
        return { valid: false, expired: false };
    }

    // 验证时间戳
    const timestamp = parseInt(timestampStr, 36);
    const now = Date.now();
    
    if (now - timestamp > TOKEN_EXPIRY) {
        return { valid: true, expired: true };
    }

    return { valid: true, expired: false };
}

/**
 * 生成 CSRF Token 并设置 Cookie
 * @param req - 请求对象
 * @param res - 响应对象
 */
export function setCsrfToken(req: Request, res: Response): string {
    const token = generateToken();
    const timestampedToken = createTimestampedToken(token);

    // 设置 CSRF Cookie
    res.cookie('XSRF-TOKEN', timestampedToken, {
        httpOnly: false, // 前端需要读取
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: TOKEN_EXPIRY,
        path: '/',
    });

    return timestampedToken;
}

/**
 * CSRF Token 生成端点
 * GET /api/v1/csrf-token
 */
export function getCsrfToken(req: Request, res: Response): void {
    const token = setCsrfToken(req, res);
    
    res.json({
        success: true,
        data: {
            token,
        },
    });
}

/**
 * CSRF 验证中间件
 * 验证请求中的 CSRF Token
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
    // 跳过安全方法（GET, HEAD, OPTIONS）
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        next();
        return;
    }

    // 从请求头或请求体获取 Token
    const headerToken = req.headers['x-csrf-token'] as string | undefined;
    const bodyToken = req.body?._csrf as string | undefined;
    const clientToken = headerToken || bodyToken;

    // 从 Cookie 获取 Token
    const cookieToken = req.cookies?.['XSRF-TOKEN'];

    // 验证 Token 存在
    if (!clientToken || !cookieToken) {
        res.status(403).json({
            success: false,
            message: 'CSRF Token 缺失',
        });
        return;
    }

    // 验证 Token 格式
    if (!isValidTokenFormat(clientToken.split('.')[0])) {
        res.status(403).json({
            success: false,
            message: 'CSRF Token 格式无效',
        });
        return;
    }

    // 验证 Cookie Token
    const verification = verifyTimestampedToken(cookieToken);
    
    if (!verification.valid) {
        res.status(403).json({
            success: false,
            message: 'CSRF Token 验证失败',
        });
        return;
    }

    if (verification.expired) {
        res.status(403).json({
            success: false,
            message: 'CSRF Token 已过期，请刷新页面',
        });
        return;
    }

    // 验证客户端 Token 与 Cookie Token 匹配
    // 提取原始 token 进行比较
    const clientOriginalToken = clientToken.split('.')[0];
    const cookieOriginalToken = cookieToken.split('.')[0];

    if (clientOriginalToken !== cookieOriginalToken) {
        res.status(403).json({
            success: false,
            message: 'CSRF Token 不匹配',
        });
        return;
    }

    next();
}

/**
 * 可选的 CSRF 保护
 * 仅在 Token 存在时验证
 */
export function optionalCsrfProtection(req: Request, res: Response, next: NextFunction): void {
    const hasToken = req.headers['x-csrf-token'] || req.body?._csrf || req.cookies?.['XSRF-TOKEN'];
    
    if (hasToken) {
        csrfProtection(req, res, next);
    } else {
        next();
    }
}

/**
 * 验证 Origin/Referer 头
 * 作为 CSRF 防护的补充措施
 */
export function verifyOrigin(req: Request, res: Response, next: NextFunction): void {
    // 跳过安全方法
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        next();
        return;
    }

    const origin = req.headers.origin || req.headers.referer;
    
    if (!origin) {
        // 没有 Origin/Referer 头，可能是旧浏览器或直接 API 调用
        // 在生产环境中可以选择拒绝
        if (config.nodeEnv === 'production') {
            res.status(403).json({
                success: false,
                message: '缺少 Origin 头',
            });
            return;
        }
        next();
        return;
    }

    try {
        const originUrl = new URL(origin);
        const allowedOrigins = [config.frontendUrl];
        
        if (config.nodeEnv === 'development') {
            allowedOrigins.push('http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080');
        }

        if (!allowedOrigins.some(allowed => {
            const allowedUrl = new URL(allowed);
            return allowedUrl.origin === originUrl.origin;
        })) {
            res.status(403).json({
                success: false,
                message: '不允许的请求来源',
            });
            return;
        }
    } catch {
        res.status(403).json({
            success: false,
            message: '无效的 Origin 头',
        });
        return;
    }

    next();
}

export default {
    getCsrfToken,
    csrfProtection,
    optionalCsrfProtection,
    verifyOrigin,
    setCsrfToken,
};
