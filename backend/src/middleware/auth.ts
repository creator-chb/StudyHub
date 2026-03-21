/**
 * JWT 认证中间件
 * 验证请求中的 JWT Token
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.js';

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

/**
 * JWT 认证中间件
 * 验证请求头中的 Authorization: Bearer <token>
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({
            success: false,
            message: '未提供认证令牌',
        });
        return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        res.status(401).json({
            success: false,
            message: '认证令牌格式无效，请使用 Bearer <token>',
        });
        return;
    }

    const token = parts[1];

    try {
        const payload = verifyToken(token);
        req.user = payload;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: '令牌无效或已过期',
        });
    }
}

/**
 * 可选的认证中间件
 * 如果提供了令牌则验证，不提供也不报错
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        next();
        return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        next();
        return;
    }

    const token = parts[1];

    try {
        const payload = verifyToken(token);
        req.user = payload;
    } catch {
        // 忽略错误，保持未认证状态
    }

    next();
}
