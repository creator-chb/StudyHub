"use strict";
/**
 * 用户模型
 * 提供用户的数据库操作
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findByEmail = findByEmail;
exports.findById = findById;
exports.findByUsername = findByUsername;
exports.create = create;
exports.verifyPassword = verifyPassword;
exports.emailExists = emailExists;
exports.usernameExists = usernameExists;
const index_js_1 = require("../db/index.js");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * 根据邮箱查找用户
 */
async function findByEmail(email) {
    const rows = await (0, index_js_1.query)('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
}
/**
 * 根据 ID 查找用户
 */
async function findById(id) {
    const rows = await (0, index_js_1.query)('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
}
/**
 * 根据用户名查找用户
 */
async function findByUsername(username) {
    const rows = await (0, index_js_1.query)('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0] || null;
}
/**
 * 创建新用户
 */
async function create(input) {
    const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
    const rows = await (0, index_js_1.query)('INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING *', [input.email, input.username, passwordHash]);
    return rows[0];
}
/**
 * 验证用户密码
 */
async function verifyPassword(user, password) {
    return bcryptjs_1.default.compare(password, user.password_hash);
}
/**
 * 检查邮箱是否已存在
 */
async function emailExists(email) {
    const rows = await (0, index_js_1.query)('SELECT 1 FROM users WHERE email = $1', [email]);
    return rows.length > 0;
}
/**
 * 检查用户名是否已存在
 */
async function usernameExists(username) {
    const rows = await (0, index_js_1.query)('SELECT 1 FROM users WHERE username = $1', [username]);
    return rows.length > 0;
}
//# sourceMappingURL=User.js.map