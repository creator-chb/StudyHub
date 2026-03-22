/**
 * 数据库迁移脚本 003
 * 创建任务表(tasks)和任务链接关联表(task_links)
 */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';
export declare const shorthands: ColumnDefinitions | undefined;
export declare function up(pgm: MigrationBuilder): Promise<void>;
export declare function down(pgm: MigrationBuilder): Promise<void>;
//# sourceMappingURL=003_tasks.d.ts.map