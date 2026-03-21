/**
 * PostgreSQL 数据库连接池模块
 * 提供数据库连接和基础查询功能
 */

import { Pool, PoolConfig } from 'pg';
import config from '../config/index.js';

const poolConfig: PoolConfig = {
    user: config.db.user,
    password: config.db.password,
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

const pool = new Pool(poolConfig);

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
export async function query(text: string, params?: unknown[]): Promise<unknown[]> {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.nodeEnv === 'development') {
        console.log('[DB] 查询执行:', { text: text.substring(0, 50), duration, rows: res.rowCount });
    }
    return res.rows;
}

/**
 * 获取一个连接
 */
export async function getClient() {
    return pool.connect();
}

/**
 * 关闭连接池
 */
export async function closePool() {
    await pool.end();
    console.log('[DB] 连接池已关闭');
}

export default pool;
