"use strict";
/**
 * 数据库迁移脚本 003
 * 创建任务表(tasks)和任务链接关联表(task_links)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shorthands = void 0;
exports.up = up;
exports.down = down;
exports.shorthands = undefined;
async function up(pgm) {
    // 创建任务表
    pgm.createTable('tasks', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: '"users"',
            onDelete: 'CASCADE',
        },
        name: {
            type: 'varchar(100)',
            notNull: true,
        },
        description: {
            type: 'text',
            default: null,
        },
        deadline: {
            type: 'timestamp',
            notNull: true,
        },
        priority: {
            type: 'varchar(10)',
            notNull: true,
            default: 'medium',
            check: "priority IN ('high', 'medium', 'low')",
        },
        is_completed: {
            type: 'boolean',
            notNull: true,
            default: false,
        },
        completed_at: {
            type: 'timestamp',
            default: null,
        },
        created_at: {
            type: 'timestamp',
            default: pgm.func('current_timestamp'),
            notNull: true,
        },
        updated_at: {
            type: 'timestamp',
            default: pgm.func('current_timestamp'),
            notNull: true,
        },
    });
    // 创建任务链接关联表
    pgm.createTable('task_links', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        task_id: {
            type: 'uuid',
            notNull: true,
            references: '"tasks"',
            onDelete: 'CASCADE',
        },
        link_id: {
            type: 'uuid',
            default: null,
            references: '"links"',
            onDelete: 'SET NULL',
        },
        url: {
            type: 'text',
            notNull: true,
        },
        sort_order: {
            type: 'integer',
            default: 0,
        },
        created_at: {
            type: 'timestamp',
            default: pgm.func('current_timestamp'),
            notNull: true,
        },
    });
    // 创建索引
    // 任务表索引
    pgm.createIndex('tasks', 'user_id');
    pgm.createIndex('tasks', ['user_id', 'is_completed']);
    pgm.createIndex('tasks', ['user_id', 'priority']);
    pgm.createIndex('tasks', ['user_id', 'deadline']);
    pgm.createIndex('tasks', ['user_id', 'created_at']);
    // 任务链接关联表索引
    pgm.createIndex('task_links', 'task_id');
    pgm.createIndex('task_links', 'link_id');
    pgm.createIndex('task_links', ['task_id', 'sort_order']);
    // 为任务表添加更新时间戳触发器
    pgm.createTrigger('tasks', 'update_tasks_updated_at', {
        when: 'BEFORE',
        operation: 'UPDATE',
        function: 'update_updated_at_column',
        level: 'ROW',
    });
}
async function down(pgm) {
    // 删除触发器
    pgm.dropTrigger('tasks', 'update_tasks_updated_at', { ifExists: true });
    // 删除表（会自动删除索引和外键约束）
    pgm.dropTable('task_links', { ifExists: true });
    pgm.dropTable('tasks', { ifExists: true });
}
//# sourceMappingURL=003_tasks.js.map