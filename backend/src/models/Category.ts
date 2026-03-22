/**
 * 分类模型
 * 提供分类的数据库操作
 */

import { query } from '../db/index.js';

export interface Category {
    id: string;
    user_id: string;
    name: string;
    color: string | null;
    icon: string | null;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
}

export interface CreateCategoryInput {
    user_id: string;
    name: string;
    color?: string;
    icon?: string;
    sort_order?: number;
}

export interface UpdateCategoryInput {
    name?: string;
    color?: string | null;
    icon?: string | null;
    sort_order?: number;
}

/**
 * 获取用户的所有分类
 */
export async function findByUserId(userId: string): Promise<Category[]> {
    const rows = await query(
        'SELECT * FROM categories WHERE user_id = $1 ORDER BY sort_order ASC, created_at ASC',
        [userId]
    );
    return rows as Category[];
}

/**
 * 根据 ID 查找分类
 */
export async function findById(id: string, userId: string): Promise<Category | null> {
    const rows = await query(
        'SELECT * FROM categories WHERE id = $1 AND user_id = $2',
        [id, userId]
    );
    return (rows[0] as Category) || null;
}

/**
 * 检查分类名称是否已存在（同一用户下）
 */
export async function nameExists(userId: string, name: string, excludeId?: string): Promise<boolean> {
    let sql = 'SELECT 1 FROM categories WHERE user_id = $1 AND name = $2';
    const params: (string | undefined)[] = [userId, name];

    if (excludeId) {
        sql += ' AND id != $3';
        params.push(excludeId);
    }

    const rows = await query(sql, params);
    return rows.length > 0;
}

/**
 * 创建新分类
 */
export async function create(input: CreateCategoryInput): Promise<Category> {
    const { user_id, name, color, icon, sort_order = 0 } = input;

    const rows = await query(
        `INSERT INTO categories (user_id, name, color, icon, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user_id, name, color || null, icon || null, sort_order]
    );

    return rows[0] as Category;
}

/**
 * 更新分类
 */
export async function update(id: string, userId: string, input: UpdateCategoryInput): Promise<Category | null> {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
    }
    if (input.color !== undefined) {
        updates.push(`color = $${paramIndex++}`);
        values.push(input.color);
    }
    if (input.icon !== undefined) {
        updates.push(`icon = $${paramIndex++}`);
        values.push(input.icon);
    }
    if (input.sort_order !== undefined) {
        updates.push(`sort_order = $${paramIndex++}`);
        values.push(input.sort_order);
    }

    if (updates.length === 0) {
        return findById(id, userId);
    }

    values.push(id, userId);
    const sql = `UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`;

    const rows = await query(sql, values);
    return (rows[0] as Category) || null;
}

/**
 * 删除分类
 */
export async function remove(id: string, userId: string): Promise<boolean> {
    const result = await query(
        'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
    );
    return result.length > 0;
}

/**
 * 获取用户的分类数量
 */
export async function countByUserId(userId: string): Promise<number> {
    const rows = await query(
        'SELECT COUNT(*) as count FROM categories WHERE user_id = $1',
        [userId]
    );
    return parseInt((rows[0] as { count: string }).count, 10);
}

/**
 * 批量更新排序
 */
export async function updateSortOrder(userId: string, sortOrders: { id: string; sort_order: number }[]): Promise<void> {
    // 使用单个查询批量更新
    for (const item of sortOrders) {
        await query(
            'UPDATE categories SET sort_order = $1 WHERE id = $2 AND user_id = $3',
            [item.sort_order, item.id, userId]
        );
    }
}
