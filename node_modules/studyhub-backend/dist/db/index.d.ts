/**
 * PostgreSQL 数据库连接池模块
 * 提供数据库连接和基础查询功能
 */
import { Pool } from 'pg';
declare const pool: Pool;
/**
 * 执行查询
 */
export declare function query(text: string, params?: unknown[]): Promise<unknown[]>;
/**
 * 获取一个连接
 */
export declare function getClient(): Promise<import("pg").PoolClient>;
/**
 * 关闭连接池
 */
export declare function closePool(): Promise<void>;
export default pool;
//# sourceMappingURL=index.d.ts.map