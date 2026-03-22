"use strict";
/**
 * 分类模型
 * 提供分类的数据库操作
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findByUserId = findByUserId;
exports.findById = findById;
exports.nameExists = nameExists;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.countByUserId = countByUserId;
exports.updateSortOrder = updateSortOrder;
const index_js_1 = require("../db/index.js");
/**
 * 获取用户的所有分类
 */
async function findByUserId(userId) {
    const rows = await (0, index_js_1.query)('SELECT * FROM categories WHERE user_id = $1 ORDER BY sort_order ASC, created_at ASC', [userId]);
    return rows;
}
/**
 * 根据 ID 查找分类
 */
async function findById(id, userId) {
    const rows = await (0, index_js_1.query)('SELECT * FROM categories WHERE id = $1 AND user_id = $2', [id, userId]);
    return rows[0] || null;
}
/**
 * 检查分类名称是否已存在（同一用户下）
 */
async function nameExists(userId, name, excludeId) {
    let sql = 'SELECT 1 FROM categories WHERE user_id = $1 AND name = $2';
    const params = [userId, name];
    if (excludeId) {
        sql += ' AND id != $3';
        params.push(excludeId);
    }
    const rows = await (0, index_js_1.query)(sql, params);
    return rows.length > 0;
}
/**
 * 创建新分类
 */
async function create(input) {
    const { user_id, name, color, icon, sort_order = 0 } = input;
    const rows = await (0, index_js_1.query)(`INSERT INTO categories (user_id, name, color, icon, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`, [user_id, name, color || null, icon || null, sort_order]);
    return rows[0];
}
/**
 * 更新分类
 */
async function update(id, userId, input) {
    const updates = [];
    const values = [];
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
    const rows = await (0, index_js_1.query)(sql, values);
    return rows[0] || null;
}
/**
 * 删除分类
 */
async function remove(id, userId) {
    const result = await (0, index_js_1.query)('DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    return result.length > 0;
}
/**
 * 获取用户的分类数量
 */
async function countByUserId(userId) {
    const rows = await (0, index_js_1.query)('SELECT COUNT(*) as count FROM categories WHERE user_id = $1', [userId]);
    return parseInt(rows[0].count, 10);
}
/**
 * 批量更新排序
 */
async function updateSortOrder(userId, sortOrders) {
    // 使用单个查询批量更新
    for (const item of sortOrders) {
        await (0, index_js_1.query)('UPDATE categories SET sort_order = $1 WHERE id = $2 AND user_id = $3', [item.sort_order, item.id, userId]);
    }
}
//# sourceMappingURL=Category.js.map