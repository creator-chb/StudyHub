/**
 * JWT 工具模块
 * 生成和验证 JWT Token
 */
export interface TokenPayload {
    userId: string;
    email: string;
    username: string;
}
/**
 * 生成访问令牌
 */
export declare function generateAccessToken(payload: TokenPayload): string;
/**
 * 生成刷新令牌
 */
export declare function generateRefreshToken(payload: TokenPayload): string;
/**
 * 验证令牌
 */
export declare function verifyToken(token: string): TokenPayload;
/**
 * 解码令牌（不验证签名）
 */
export declare function decodeToken(token: string): TokenPayload | null;
//# sourceMappingURL=jwt.d.ts.map