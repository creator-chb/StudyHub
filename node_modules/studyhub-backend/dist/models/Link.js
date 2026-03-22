"use strict";
/**
 * 链接模型
 * 提供链接的数据库操作
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findByUserId = findByUserId;
exports.findById = findById;
exports.urlExists = urlExists;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.batchRemove = batchRemove;
exports.togglePin = togglePin;
exports.recordClick = recordClick;
exports.countByUserId = countByUserId;
exports.findPinnedByUserId = findPinnedByUserId;
const index_js_1 = require("../db/index.js");
/**
 * 获取用户的链接列表
 */
async function findByUserId(userId, filter, pagination) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE l.user_id = $1';
    const params = [userId];
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
    const countResult = await (0, index_js_1.query)(`SELECT COUNT(*) as total FROM links l ${whereClause}`, params.slice(0, paramIndex - 1));
    const total = parseInt(countResult[0].total, 10);
    // 获取分页数据
    const queryParams = [...params, limit, offset];
    const rows = await (0, index_js_1.query)(`SELECT l.*, c.name as category_name, c.color as category_color
         FROM links l
         LEFT JOIN categories c ON l.category_id = c.id
         ${whereClause}
         ORDER BY l.is_pinned DESC, l.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`, queryParams);
    return { links: rows, total };
}
/**
 * 根据 ID 查找链接
 */
async function findById(id, userId) {
    const rows = await (0, index_js_1.query)(`SELECT l.*, c.name as category_name, c.color as category_color
         FROM links l
         LEFT JOIN categories c ON l.category_id = c.id
         WHERE l.id = $1 AND l.user_id = $2`, [id, userId]);
    return rows[0] || null;
}
/**
 * 检查 URL 是否已存在（同一用户下）
 */
async function urlExists(userId, url, excludeId) {
    let sql = 'SELECT 1 FROM links WHERE user_id = $1 AND url = $2';
    const params = [userId, url];
    if (excludeId) {
        sql += ' AND id != $3';
        params.push(excludeId);
    }
    const rows = await (0, index_js_1.query)(sql, params);
    return rows.length > 0;
}
/**
 * 创建新链接
 */
async function create(input) {
    const { user_id, category_id = null, title, url, description = '', is_pinned = false, } = input;
    const rows = await (0, index_js_1.query)(`INSERT INTO links (user_id, category_id, title, url, description, is_pinned)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`, [user_id, category_id, title, url, description || null, is_pinned]);
    return rows[0];
}
/**
 * 更新链接
 */
async function update(id, userId, input) {
    const updates = [];
    const values = [];
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
        return link ? link : null;
    }
    values.push(id, userId);
    const sql = `UPDATE links SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`;
    const rows = await (0, index_js_1.query)(sql, values);
    return rows[0] || null;
}
/**
 * 删除链接
 */
async function remove(id, userId) {
    const result = await (0, index_js_1.query)('DELETE FROM links WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    return result.length > 0;
}
/**
 * 批量删除链接
 */
async function batchRemove(ids, userId) {
    if (ids.length === 0)
        return 0;
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
    const result = await (0, index_js_1.query)(`DELETE FROM links WHERE id IN (${placeholders}) AND user_id = $1 RETURNING id`, [userId, ...ids]);
    return result.length;
}
/**
 * 切换置顶状态
 */
async function togglePin(id, userId) {
    const rows = await (0, index_js_1.query)(`UPDATE links
         SET is_pinned = NOT is_pinned
         WHERE id = $1 AND user_id = $2
         RETURNING *`, [id, userId]);
    return rows[0] || null;
}
/**
 * 记录点击
 */
async function recordClick(id, userId) {
    await (0, index_js_1.query)(`UPDATE links
         SET click_count = click_count + 1, last_clicked_at = current_timestamp
         WHERE id = $1 AND user_id = $2`, [id, userId]);
}
/**
 * 获取用户的链接数量
 */
async function countByUserId(userId) {
    const rows = await (0, index_js_1.query)('SELECT COUNT(*) as count FROM links WHERE user_id = $1', [userId]);
    return parseInt(rows[0].count, 10);
}
/**
 * 获取置顶链接
 */
async function findPinnedByUserId(userId, limit = 10) {
    const rows = await (0, index_js_1.query)(`SELECT l.*, c.name as category_name, c.color as category_color
         FROM links l
         LEFT JOIN categories c ON l.category_id = c.id
         WHERE l.user_id = $1 AND l.is_pinned = true
         ORDER BY l.updated_at DESC
         LIMIT $2`, [userId, limit]);
    return rows;
}
//# sourceMappingURL=Link.js.map