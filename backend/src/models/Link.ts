/**
 * 链接模型
 * 提供链接的数据库操作
 */

import { query } from '../db/index.js';

export interface Link {
    id: string;
    user_id: string;
    category_id: string | null;
    title: string;
    url: string;
    description: string | null;
    is_pinned: boolean;
    click_count: number;
    last_clicked_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface LinkWithCategory extends Link {
    category_name: string | null;
    category_color: string | null;
}

export interface CreateLinkInput {
    user_id: string;
    category_id?: string | null;
    title: string;
    url: string;
    description?: string;
    is_pinned?: boolean;
}

export interface UpdateLinkInput {
    category_id?: string | null;
    title?: string;
    url?: string;
    description?: string | null;
    is_pinned?: boolean;
}

export interface LinkFilter {
    category_id?: string;
    is_pinned?: boolean;
    search?: string;
}

export interface PaginationOptions {
    page?: number;
    limit?: number;
}

/**
 * 获取用户的链接列表
 */
export async function findByUserId(
    userId: string,
    filter?: LinkFilter,
    pagination?: PaginationOptions
): Promise<{ links: LinkWithCategory[]; total: number }> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE l.user_id = $1';
    const params: (string | boolean | number)[] = [userId];
    let paramIndex = 2;

    if (filter?.category_id) {
        whereClause += ` AND l.category_id = $${paramIndex++}`;
        params.push(filter.category_id);
    }

    if (filter?.is_pinned !== undefined) {
        whereClause += ` AND l.is_pinned = $${paramIndex++}`;
        params.push(filter.is_pinned);
    }

    if (filter?.search) {
        whereClause += ` AND (l.title ILIKE $${paramIndex} OR l.url ILIKE $${paramIndex} OR l.description ILIKE $${paramIndex})`;
        params.push(`%${filter.search}%`);
        paramIndex++;
    }

    // 获取总数
    const countResult = await query(
        `SELECT COUNT(*) as total FROM links l ${whereClause}`,
        params.slice(0, paramIndex - 1)
    );
    const total = parseInt((countResult[0] as { total: string }).total, 10);

    // 获取分页数据
    const queryParams = [...params, limit, offset];
    const rows = await query(
        `SELECT l.*, c.name as category_name, c.color as category_color
         FROM links l
         LEFT JOIN categories c ON l.category_id = c.id
         ${whereClause}
         ORDER BY l.is_pinned DESC, l.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        queryParams
    );

    return { links: rows as LinkWithCategory[], total };
}

/**
 * 根据 ID 查找链接
 */
export async function findById(id: string, userId: string): Promise<LinkWithCategory | null> {
    const rows = await query(
        `SELECT l.*, c.name as category_name, c.color as category_color
         FROM links l
         LEFT JOIN categories c ON l.category_id = c.id
         WHERE l.id = $1 AND l.user_id = $2`,
        [id, userId]
    );
    return (rows[0] as LinkWithCategory) || null;
}

/**
 * 检查 URL 是否已存在（同一用户下）
 */
export async function urlExists(userId: string, url: string, excludeId?: string): Promise<boolean> {
    let sql = 'SELECT 1 FROM links WHERE user_id = $1 AND url = $2';
    const params: (string | undefined)[] = [userId, url];

    if (excludeId) {
        sql += ' AND id != $3';
        params.push(excludeId);
    }

    const rows = await query(sql, params);
    return rows.length > 0;
}

/**
 * 创建新链接
 */
export async function create(input: CreateLinkInput): Promise<Link> {
    const {
        user_id,
        category_id = null,
        title,
        url,
        description = '',
        is_pinned = false,
    } = input;

    const rows = await query(
        `INSERT INTO links (user_id, category_id, title, url, description, is_pinned)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [user_id, category_id, title, url, description || null, is_pinned]
    );

    return rows[0] as Link;
}

/**
 * 更新链接
 */
export async function update(id: string, userId: string, input: UpdateLinkInput): Promise<Link | null> {
    const updates: string[] = [];
    const values: (string | boolean | null)[] = [];
    let paramIndex = 1;

    if (input.category_id !== undefined) {
        updates.push(`category_id = $${paramIndex++}`);
        values.push(input.category_id);
    }
    if (input.title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(input.title);
    }
    if (input.url !== undefined) {
        updates.push(`url = $${paramIndex++}`);
        values.push(input.url);
    }
    if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(input.description || null);
    }
    if (input.is_pinned !== undefined) {
        updates.push(`is_pinned = $${paramIndex++}`);
        values.push(input.is_pinned);
    }

    if (updates.length === 0) {
        const link = await findById(id, userId);
        return link ? (link as unknown as Link) : null;
    }

    values.push(id, userId);
    const sql = `UPDATE links SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`;

    const rows = await query(sql, values);
    return (rows[0] as Link) || null;
}

/**
 * 删除链接
 */
export async function remove(id: string, userId: string): Promise<boolean> {
    const result = await query(
        'DELETE FROM links WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
    );
    return result.length > 0;
}

/**
 * 批量删除链接
 */
export async function batchRemove(ids: string[], userId: string): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
    const result = await query(
        `DELETE FROM links WHERE id IN (${placeholders}) AND user_id = $1 RETURNING id`,
        [userId, ...ids]
    );
    return result.length;
}

/**
 * 切换置顶状态
 */
export async function togglePin(id: string, userId: string): Promise<Link | null> {
    const rows = await query(
        `UPDATE links
         SET is_pinned = NOT is_pinned
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, userId]
    );
    return (rows[0] as Link) || null;
}

/**
 * 记录点击
 */
export async function recordClick(id: string, userId: string): Promise<void> {
    await query(
        `UPDATE links
         SET click_count = click_count + 1, last_clicked_at = current_timestamp
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
    );
}

/**
 * 获取用户的链接数量
 */
export async function countByUserId(userId: string): Promise<number> {
    const rows = await query(
        'SELECT COUNT(*) as count FROM links WHERE user_id = $1',
        [userId]
    );
    return parseInt((rows[0] as { count: string }).count, 10);
}

/**
 * 获取置顶链接
 */
export async function findPinnedByUserId(userId: string, limit = 10): Promise<LinkWithCategory[]> {
    const rows = await query(
        `SELECT l.*, c.name as category_name, c.color as category_color
         FROM links l
         LEFT JOIN categories c ON l.category_id = c.id
         WHERE l.user_id = $1 AND l.is_pinned = true
         ORDER BY l.updated_at DESC
         LIMIT $2`,
        [userId, limit]
    );
    return rows as LinkWithCategory[];
}
