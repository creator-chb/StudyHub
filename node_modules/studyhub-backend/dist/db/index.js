"use strict";
/**
 * PostgreSQL 数据库连接池模块
 * 提供数据库连接和基础查询功能
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.getClient = getClient;
exports.closePool = closePool;
const pg_1 = require("pg");
const index_js_1 = __importDefault(require("../config/index.js"));
const poolConfig = {
    user: index_js_1.default.db.user,
    password: index_js_1.default.db.password,
    host: index_js_1.default.db.host,
    port: index_js_1.default.db.port,
    database: index_js_1.default.db.database,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
const pool = new pg_1.Pool(poolConfig);
// 测试数据库连接
pool.on('connect', () => {
    console.log('[DB] 已连接到 PostgreSQL 数据库');
});
pool.on('error', (err) => {
    console.error('[DB] 数据库连接错误:', err.message);
});
/**
 * 执行查询
 */
async function query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (index_js_1.default.nodeEnv === 'development') {
        console.log('[DB] 查询执行:', { text: text.substring(0, 50), duration, rows: res.rowCount });
    }
    return res.rows;
}
/**
 * 获取一个连接
 */
async function getClient() {
    return pool.connect();
}
/**
 * 关闭连接池
 */
async function closePool() {
    await pool.end();
    console.log('[DB] 连接池已关闭');
}
exports.default = pool;
//# sourceMappingURL=index.js.map