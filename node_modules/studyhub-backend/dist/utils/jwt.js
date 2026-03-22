"use strict";
/**
 * JWT 工具模块
 * 生成和验证 JWT Token
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyToken = verifyToken;
exports.decodeToken = decodeToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = __importDefault(require("../config/index.js"));
/**
 * 生成访问令牌
 */
function generateAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, index_js_1.default.jwt.secret, {
        expiresIn: index_js_1.default.jwt.expiresIn,
    });
}
/**
 * 生成刷新令牌
 */
function generateRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, index_js_1.default.jwt.secret, {
        expiresIn: index_js_1.default.jwt.refreshExpiresIn,
    });
}
/**
 * 验证令牌
 */
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, index_js_1.default.jwt.secret);
}
/**
 * 解码令牌（不验证签名）
 */
function decodeToken(token) {
    const decoded = jsonwebtoken_1.default.decode(token);
    return decoded;
}
//# sourceMappingURL=jwt.js.map