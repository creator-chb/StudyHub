/**
 * 数据库迁移脚本 002
 * 创建分类表(categories)和链接表(links)
 */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';
export declare const shorthands: ColumnDefinitions | undefined;
export declare function up(pgm: MigrationBuilder): Promise<void>;
export declare function down(pgm: MigrationBuilder): Promise<void>;
//# sourceMappingURL=002_categories_and_links.d.ts.map