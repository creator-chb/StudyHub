/**
 * 用户模型
 * 提供用户的数据库操作
 */

import { query } from '../db/index.js';
import bcrypt from 'bcryptjs';

export interface User {
    id: string;
    email: string;
    username: string;
    password_hash: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateUserInput {
    email: string;
    username: string;
    password: string;
}

/**
 * 根据邮箱查找用户
 */
export async function findByEmail(email: string): Promise<User | null> {
    const rows = await query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
}

/**
 * 根据 ID 查找用户
 */
export async function findById(id: string): Promise<User | null> {
    const rows = await query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
}

/**
 * 根据用户名查找用户
 */
export async function findByUsername(username: string): Promise<User | null> {
    const rows = await query('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0] || null;
}

/**
 * 创建新用户
 */
export async function create(input: CreateUserInput): Promise<User> {
    const passwordHash = await bcrypt.hash(input.password, 10);

    const rows = await query(
        'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING *',
        [input.email, input.username, passwordHash]
    );

    return rows[0];
}

/**
 * 验证用户密码
 */
export async function verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
}

/**
 * 检查邮箱是否已存在
 */
export async function emailExists(email: string): Promise<boolean> {
    const rows = await query('SELECT 1 FROM users WHERE email = $1', [email]);
    return rows.length > 0;
}

/**
 * 检查用户名是否已存在
 */
export async function usernameExists(username: string): Promise<boolean> {
    const rows = await query('SELECT 1 FROM users WHERE username = $1', [username]);
    return rows.length > 0;
}
