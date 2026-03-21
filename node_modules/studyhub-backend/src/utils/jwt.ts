/**
 * JWT 工具模块
 * 生成和验证 JWT Token
 */

import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export interface TokenPayload {
    userId: string;
    email: string;
    username: string;
}

/**
 * 生成访问令牌
 */
export function generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
    });
}

/**
 * 生成刷新令牌
 */
export function generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.refreshExpiresIn,
    });
}

/**
 * 验证令牌
 */
export function verifyToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwt.secret) as TokenPayload;
}

/**
 * 解码令牌（不验证签名）
 */
export function decodeToken(token: string): TokenPayload | null {
    const decoded = jwt.decode(token);
    return decoded as TokenPayload | null;
}
