"use strict";
/**
 * JWT 认证中间件
 * 验证请求中的 JWT Token
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.optionalAuth = optionalAuth;
const jwt_js_1 = require("../utils/jwt.js");
const redis_js_1 = require("../db/redis.js");
/**
 * JWT 认证中间件
 * 验证请求头中的 Authorization: Bearer <token>
 */
async function authenticate(req, res, next) {
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
        // 检查 Token 是否在黑名单中
        const isBlacklisted = await (0, redis_js_1.isTokenBlacklisted)(token);
        if (isBlacklisted) {
            res.status(401).json({
                success: false,
                message: '令牌已被撤销，请重新登录',
            });
            return;
        }
        const payload = (0, jwt_js_1.verifyToken)(token);
        req.user = payload;
        next();
    }
    catch (error) {
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
function optionalAuth(req, res, next) {
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
        const payload = (0, jwt_js_1.verifyToken)(token);
        req.user = payload;
    }
    catch {
        // 忽略错误，保持未认证状态
    }
    next();
}
//# sourceMappingURL=auth.js.map