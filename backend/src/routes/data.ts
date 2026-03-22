/**
 * 数据迁移路由
 * 处理数据导入导出操作
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { exportRateLimiter, importRateLimiter } from '../middleware/rateLimiter.js';
import * as LinkModel from '../models/Link.js';
import * as CategoryModel from '../models/Category.js';
import * as TaskModel from '../models/Task.js';
import * as UserModel from '../models/User.js';

const router = Router();

// =============================================
// 数据导出
// =============================================

/**
 * GET /api/v1/data/export
 * 导出用户数据
 */
router.get('/export', authenticate, exportRateLimiter, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const format = (req.query.format as string) || 'json';

        // 获取用户数据
        const user = await UserModel.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: '用户不存在',
            });
            return;
        }

        // 获取所有数据
        const { links } = await LinkModel.findByUserId(userId, {}, { page: 1, limit: 10000 });
        const categories = await CategoryModel.findByUserId(userId);
        const { tasks } = await TaskModel.findByUserId(userId, {}, { page: 1, limit: 10000 });

        // 构建导出数据
        const exportData = {
            version: '2.0',
            exported_at: new Date().toISOString(),
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
            data: {
                categories: categories.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    color: cat.color,
                    icon: cat.icon,
                    sort_order: cat.sort_order,
                    created_at: cat.created_at,
                    updated_at: cat.updated_at,
                })),
                links: links.map(link => ({
                    id: link.id,
                    title: link.title,
                    url: link.url,
                    description: link.description,
                    category_id: link.category_id,
                    is_pinned: link.is_pinned,
                    click_count: link.click_count,
                    created_at: link.created_at,
                    updated_at: link.updated_at,
                })),
                tasks: tasks.map(task => ({
                    id: task.id,
                    name: task.name,
                    description: task.description,
                    deadline: task.deadline,
                    priority: task.priority,
                    is_completed: task.is_completed,
                    completed_at: task.completed_at,
                    links: task.links,
                    created_at: task.created_at,
                    updated_at: task.updated_at,
                })),
            },
            metadata: {
                total_categories: categories.length,
                total_links: links.length,
                total_tasks: tasks.length,
            },
        };

        if (format === 'json') {
            // JSON 格式导出
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="studyhub-export-${Date.now()}.json"`);
            res.json({
                success: true,
                data: exportData,
            });
        } else {
            res.status(400).json({
                success: false,
                message: '不支持的导出格式',
            });
        }
    } catch (error) {
        console.error('[Data] 导出错误:', error);
        res.status(500).json({
            success: false,
            message: '导出数据失败',
        });
    }
});

// =============================================
// 数据导入
// =============================================

/**
 * 导入数据项的统计
 */
interface ImportSummary {
    added: number;
    updated: number;
    skipped: number;
    errors: string[];
}

/**
 * POST /api/v1/data/import
 * 导入用户数据
 */
router.post('/import', authenticate, importRateLimiter, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { data, strategy = 'merge' } = req.body;

        if (!data) {
            res.status(400).json({
                success: false,
                message: '请提供导入数据',
            });
            return;
        }

        // 验证数据版本
        const version = data.version || '1.x';
        if (!['1.x', '2.0'].includes(version)) {
            res.status(400).json({
                success: false,
                message: '不支持的数据版本',
            });
            return;
        }

        // 初始化统计
        const summary: Record<string, ImportSummary> = {
            categories: { added: 0, updated: 0, skipped: 0, errors: [] },
            links: { added: 0, updated: 0, skipped: 0, errors: [] },
            tasks: { added: 0, updated: 0, skipped: 0, errors: [] },
        };

        // 如果是覆盖策略，先清空现有数据
        if (strategy === 'overwrite') {
            await overwriteUserData(userId);
        }

        // 导入分类
        if (data.data?.categories || data.categories) {
            const categories = data.data?.categories || data.categories;
            await importCategories(userId, categories, summary.categories, strategy, version);
        }

        // 导入链接
        if (data.data?.links || data.links) {
            const links = data.data?.links || data.links;
            await importLinks(userId, links, summary.links, strategy, version);
        }

        // 导入任务
        if (data.data?.tasks || data.tasks) {
            const tasks = data.data?.tasks || data.tasks;
            await importTasks(userId, tasks, summary.tasks, strategy, version);
        }

        res.json({
            success: true,
            message: '导入成功',
            summary: {
                categories: {
                    added: summary.categories.added,
                    updated: summary.categories.updated,
                    skipped: summary.categories.skipped,
                },
                links: {
                    added: summary.links.added,
                    updated: summary.links.updated,
                    skipped: summary.links.skipped,
                },
                tasks: {
                    added: summary.tasks.added,
                    updated: summary.tasks.updated,
                    skipped: summary.tasks.skipped,
                },
            },
            errors: [
                ...summary.categories.errors,
                ...summary.links.errors,
                ...summary.tasks.errors,
            ],
        });
    } catch (error) {
        console.error('[Data] 导入错误:', error);
        res.status(500).json({
            success: false,
            message: '导入数据失败',
        });
    }
});

/**
 * 清空用户数据（覆盖策略）
 */
async function overwriteUserData(userId: string): Promise<void> {
    // 获取所有数据并删除
    const { links } = await LinkModel.findByUserId(userId, {}, { page: 1, limit: 10000 });
    const categories = await CategoryModel.findByUserId(userId);
    const { tasks } = await TaskModel.findByUserId(userId, {}, { page: 1, limit: 10000 });

    // 删除链接
    for (const link of links) {
        await LinkModel.remove(link.id, userId);
    }

    // 删除任务
    for (const task of tasks) {
        await TaskModel.remove(task.id, userId);
    }

    // 删除分类
    for (const category of categories) {
        await CategoryModel.remove(category.id, userId);
    }
}

/**
 * 导入分类
 */
async function importCategories(
    userId: string,
    categories: unknown[],
    summary: ImportSummary,
    strategy: string,
    _version: string
): Promise<void> {
    for (const cat of categories) {
        try {
            const categoryData = cat as Record<string, unknown>;
            const name = (categoryData.name as string) || '';
            
            if (!name) {
                summary.errors.push('分类名称不能为空');
                continue;
            }

            // 检查是否已存在
            const existing = await CategoryModel.findByName(userId, name);

            if (existing) {
                if (strategy === 'merge') {
                    // 合并策略：跳过已存在的
                    summary.skipped++;
                    continue;
                }
                // 更新现有分类
                await CategoryModel.update(existing.id, userId, {
                    color: categoryData.color as string,
                    icon: categoryData.icon as string,
                    sort_order: categoryData.sort_order as number,
                });
                summary.updated++;
            } else {
                // 创建新分类
                await CategoryModel.create({
                    user_id: userId,
                    name: name,
                    color: (categoryData.color as string) || '#4f8cff',
                    icon: categoryData.icon as string,
                    sort_order: (categoryData.sort_order as number) || 0,
                });
                summary.added++;
            }
        } catch (error) {
            summary.errors.push(`分类导入失败: ${(error as Error).message}`);
        }
    }
}

/**
 * 导入链接
 */
async function importLinks(
    userId: string,
    links: unknown[],
    summary: ImportSummary,
    strategy: string,
    _version: string
): Promise<void> {
    for (const link of links) {
        try {
            const linkData = link as Record<string, unknown>;
            
            // 字段映射（v1.x -> v2.0）
            const title = (linkData.title as string) || (linkData.name as string) || '';
            const url = (linkData.url as string) || '';
            
            if (!title || !url) {
                summary.errors.push('链接标题和 URL 不能为空');
                continue;
            }

            // 检查是否已存在（基于 URL）
            const existing = await LinkModel.findByUrl(userId, url);

            if (existing) {
                if (strategy === 'merge') {
                    // 合并策略：跳过已存在的
                    summary.skipped++;
                    continue;
                }
                // 更新现有链接
                await LinkModel.update(existing.id, userId, {
                    title,
                    description: linkData.description as string,
                    category_id: linkData.category_id as string,
                    is_pinned: linkData.is_pinned as boolean,
                });
                summary.updated++;
            } else {
                // 创建新链接
                await LinkModel.create({
                    user_id: userId,
                    title,
                    url,
                    description: (linkData.description as string) || '',
                    category_id: (linkData.category_id as string) || null,
                    is_pinned: (linkData.is_pinned as boolean) || false,
                });
                summary.added++;
            }
        } catch (error) {
            summary.errors.push(`链接导入失败: ${(error as Error).message}`);
        }
    }
}

/**
 * 导入任务
 */
async function importTasks(
    userId: string,
    tasks: unknown[],
    summary: ImportSummary,
    strategy: string,
    _version: string
): Promise<void> {
    for (const task of tasks) {
        try {
            const taskData = task as Record<string, unknown>;
            const name = (taskData.name as string) || '';
            
            if (!name) {
                summary.errors.push('任务名称不能为空');
                continue;
            }

            // 处理截止时间字段映射
            const deadline = (taskData.deadline as string) || (taskData.time as string);

            // 检查是否已存在（基于名称和截止时间）
            const { tasks: existingTasks } = await TaskModel.findByUserId(
                userId,
                { search: name },
                { page: 1, limit: 10 }
            );
            const existing = existingTasks.find(t => t.name === name);

            if (existing) {
                if (strategy === 'merge') {
                    // 合并策略：跳过已存在的
                    summary.skipped++;
                    continue;
                }
                // 更新现有任务
                await TaskModel.update(existing.id, userId, {
                    name,
                    description: taskData.description as string,
                    deadline,
                    priority: taskData.priority as 'high' | 'medium' | 'low',
                    is_completed: taskData.is_completed as boolean,
                    links: taskData.links as string[],
                });
                summary.updated++;
            } else {
                // 创建新任务
                await TaskModel.create({
                    user_id: userId,
                    name,
                    description: (taskData.description as string) || '',
                    deadline: deadline || new Date().toISOString(),
                    priority: (taskData.priority as 'high' | 'medium' | 'low') || 'medium',
                    links: (taskData.links as string[]) || [],
                });
                summary.added++;
            }
        } catch (error) {
            summary.errors.push(`任务导入失败: ${(error as Error).message}`);
        }
    }
}

export default router;
