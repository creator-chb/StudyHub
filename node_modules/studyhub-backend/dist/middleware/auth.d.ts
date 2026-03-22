/**
 * JWT 认证中间件
 * 验证请求中的 JWT Token
 */
import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../utils/jwt.js';
export interface AuthRequest extends Request {
    user?: TokenPayload;
}
/**
 * JWT 认证中间件
 * 验证请求头中的 Authorization: Bearer <token>
 */
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * 可选的认证中间件
 * 如果提供了令牌则验证，不提供也不报错
 */
export declare function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map