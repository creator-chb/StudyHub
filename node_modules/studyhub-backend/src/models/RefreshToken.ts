/**
 * 刷新令牌模型
 * 管理用户的 JWT 刷新令牌
 */

import { query } from '../db/index.js';

export interface RefreshToken {
    id: string;
    user_id: string;
    token: string;
    expires_at: Date;
    created_at: Date;
}

/**
 * 保存刷新令牌
 */
export async function save(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    const rows = await query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *',
        [userId, token, expiresAt]
    );
    return rows[0] as RefreshToken;
}

/**
 * 查找刷新令牌
 */
export async function find(token: string): Promise<RefreshToken | null> {
    const rows = await query(
        'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
        [token]
    );
    return (rows[0] as RefreshToken) || null;
}

/**
 * 删除用户的刷新令牌
 */
export async function remove(userId: string): Promise<void> {
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

/**
 * 删除指定刷新令牌
 */
export async function deleteToken(token: string): Promise<void> {
    await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
}

/**
 * 清理过期令牌
 */
export async function cleanExpired(): Promise<number> {
    const result = await query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    return result.length;
}
