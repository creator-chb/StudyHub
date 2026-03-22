"use strict";
/**
 * 数据库迁移脚本 002
 * 创建分类表(categories)和链接表(links)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shorthands = void 0;
exports.up = up;
exports.down = down;
exports.shorthands = undefined;
async function up(pgm) {
    // 创建分类表
    pgm.createTable('categories', {
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
        color: {
            type: 'varchar(7)', // hex color like #FF5733
            default: null,
        },
        icon: {
            type: 'varchar(50)',
            default: null,
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
        updated_at: {
            type: 'timestamp',
            default: pgm.func('current_timestamp'),
            notNull: true,
        },
    });
    // 创建链接表
    pgm.createTable('links', {
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
        category_id: {
            type: 'uuid',
            default: null,
            references: '"categories"',
            onDelete: 'SET NULL',
        },
        title: {
            type: 'varchar(255)',
            notNull: true,
        },
        url: {
            type: 'text',
            notNull: true,
        },
        description: {
            type: 'text',
            default: null,
        },
        is_pinned: {
            type: 'boolean',
            default: false,
        },
        click_count: {
            type: 'integer',
            default: 0,
        },
        last_clicked_at: {
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
    // 创建索引
    // 分类表索引
    pgm.createIndex('categories', 'user_id');
    pgm.createIndex('categories', ['user_id', 'sort_order']);
    pgm.createIndex('categories', ['user_id', 'name'], { unique: true });
    // 链接表索引
    pgm.createIndex('links', 'user_id');
    pgm.createIndex('links', 'category_id');
    pgm.createIndex('links', ['user_id', 'is_pinned', 'created_at']);
    pgm.createIndex('links', ['user_id', 'created_at']);
    pgm.createIndex('links', 'url');
    // 创建更新时间戳触发器函数
    pgm.createFunction('update_updated_at_column', [], {
        returns: 'trigger',
        language: 'plpgsql',
    }, `
        BEGIN
            NEW.updated_at = current_timestamp;
            RETURN NEW;
        END;
        `);
    // 为分类表添加触发器
    pgm.createTrigger('categories', 'update_categories_updated_at', {
        when: 'BEFORE',
        operation: 'UPDATE',
        function: 'update_updated_at_column',
        level: 'ROW',
    });
    // 为链接表添加触发器
    pgm.createTrigger('links', 'update_links_updated_at', {
        when: 'BEFORE',
        operation: 'UPDATE',
        function: 'update_updated_at_column',
        level: 'ROW',
    });
}
async function down(pgm) {
    // 删除触发器
    pgm.dropTrigger('links', 'update_links_updated_at', { ifExists: true });
    pgm.dropTrigger('categories', 'update_categories_updated_at', { ifExists: true });
    // 删除触发器函数
    pgm.dropFunction('update_updated_at_column', [], { ifExists: true });
    // 删除表（会自动删除索引和外键约束）
    pgm.dropTable('links', { ifExists: true });
    pgm.dropTable('categories', { ifExists: true });
}
//# sourceMappingURL=002_categories_and_links.js.map