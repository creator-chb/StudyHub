/**
 * 刷新令牌模型
 * 管理用户的 JWT 刷新令牌
 */
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
export declare function save(userId: string, token: string, expiresAt: Date): Promise<RefreshToken>;
/**
 * 查找刷新令牌
 */
export declare function find(token: string): Promise<RefreshToken | null>;
/**
 * 删除用户的刷新令牌
 */
export declare function remove(userId: string): Promise<void>;
/**
 * 删除指定刷新令牌
 */
export declare function deleteToken(token: string): Promise<void>;
/**
 * 清理过期令牌
 */
export declare function cleanExpired(): Promise<number>;
//# sourceMappingURL=RefreshToken.d.ts.map