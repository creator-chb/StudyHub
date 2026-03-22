"use strict";
/**
 * 刷新令牌模型
 * 管理用户的 JWT 刷新令牌
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.save = save;
exports.find = find;
exports.remove = remove;
exports.deleteToken = deleteToken;
exports.cleanExpired = cleanExpired;
const index_js_1 = require("../db/index.js");
/**
 * 保存刷新令牌
 */
async function save(userId, token, expiresAt) {
    const rows = await (0, index_js_1.query)('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *', [userId, token, expiresAt]);
    return rows[0];
}
/**
 * 查找刷新令牌
 */
async function find(token) {
    const rows = await (0, index_js_1.query)('SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()', [token]);
    return rows[0] || null;
}
/**
 * 删除用户的刷新令牌
 */
async function remove(userId) {
    await (0, index_js_1.query)('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}
/**
 * 删除指定刷新令牌
 */
async function deleteToken(token) {
    await (0, index_js_1.query)('DELETE FROM refresh_tokens WHERE token = $1', [token]);
}
/**
 * 清理过期令牌
 */
async function cleanExpired() {
    const result = await (0, index_js_1.query)('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    return result.length;
}
//# sourceMappingURL=RefreshToken.js.map