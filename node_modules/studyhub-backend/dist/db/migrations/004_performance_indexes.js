"use strict";
/**
 * 数据库性能优化迁移
 * 添加索引以提高查询性能
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
const index_js_1 = require("../index.js");
async function up() {
    console.log('[Migration] 创建性能优化索引...');
    // links 表索引
    await (0, index_js_1.query)(`
        CREATE INDEX IF NOT EXISTS idx_links_user_pinned 
        ON links(user_id, is_pinned) 
        WHERE is_pinned = true
    `);
    await (0, index_js_1.query)(`
        CREATE INDEX IF NOT EXISTS idx_links_user_category 
        ON links(user_id, category_id)
    `);
    await (0, index_js_1.query)(`
        CREATE INDEX IF NOT EXISTS idx_links_user_created 
        ON links(user_id, created_at DESC)
    `);
    // tasks 表索引
    await (0, index_js_1.query)(`
        CREATE INDEX IF NOT EXISTS idx_tasks_user_completed 
        ON tasks(user_id, is_completed)
    `);
    await (0, index_js_1.query)(`
        CREATE INDEX IF NOT EXISTS idx_tasks_user_deadline 
        ON tasks(user_id, deadline)
    `);
    await (0, index_js_1.query)(`
        CREATE INDEX IF NOT EXISTS idx_tasks_user_priority 
        ON tasks(user_id, priority)
    `);
    // categories 表索引
    await (0, index_js_1.query)(`
        CREATE INDEX IF NOT EXISTS idx_categories_user_sort 
        ON categories(user_id, sort_order)
    `);
    console.log('[Migration] 性能优化索引创建完成');
}
async function down() {
    console.log('[Migration] 删除性能优化索引...');
    // 删除 links 表索引
    await (0, index_js_1.query)('DROP INDEX IF EXISTS idx_links_user_pinned');
    await (0, index_js_1.query)('DROP INDEX IF EXISTS idx_links_user_category');
    await (0, index_js_1.query)('DROP INDEX IF EXISTS idx_links_user_created');
    // 删除 tasks 表索引
    await (0, index_js_1.query)('DROP INDEX IF EXISTS idx_tasks_user_completed');
    await (0, index_js_1.query)('DROP INDEX IF EXISTS idx_tasks_user_deadline');
    await (0, index_js_1.query)('DROP INDEX IF EXISTS idx_tasks_user_priority');
    // 删除 categories 表索引
    await (0, index_js_1.query)('DROP INDEX IF EXISTS idx_categories_user_sort');
    console.log('[Migration] 性能优化索引删除完成');
}
//# sourceMappingURL=004_performance_indexes.js.map