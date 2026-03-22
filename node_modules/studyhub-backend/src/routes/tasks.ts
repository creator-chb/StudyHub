/**
 * 任务管理路由
 * 处理任务的 CRUD 操作
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import * as TaskModel from '../models/Task.js';
import {
    createTaskSchema,
    updateTaskSchema,
    taskFilterSchema,
    batchDeleteTasksSchema,
    batchCompleteTasksSchema,
} from '../utils/validation.js';
import { ZodError } from 'zod';

const router = Router();

/**
 * GET /api/v1/tasks
 * 获取任务列表（支持筛选、分页）
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        // 验证查询参数
        const validatedQuery = taskFilterSchema.parse(req.query);

        const filter: TaskModel.TaskFilter = {};
        if (validatedQuery.status !== 'all') {
            filter.status = validatedQuery.status;
        }
        if (validatedQuery.priority) {
            filter.priority = validatedQuery.priority;
        }
        if (validatedQuery.search) {
            filter.search = validatedQuery.search;
        }

        const pagination = {
            page: validatedQuery.page,
            limit: validatedQuery.limit,
        };

        const { tasks, total } = await TaskModel.findByUserId(userId, filter, pagination);

        res.json({
            success: true,
            data: {
                tasks,
                pagination: {
                    page: validatedQuery.page,
                    limit: validatedQuery.limit,
                    total,
                    totalPages: Math.ceil(total / validatedQuery.limit),
                },
            },
        });
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({
                success: false,
                message: '查询参数错误',
                errors: error.issues.map((e) => ({
                    field: String(e.path.join('.')),
                    message: String(e.message),
                })),
            });
            return;
        }

        console.error('[Tasks] 获取列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取任务列表失败',
        });
    }
});

/**
 * GET /api/v1/tasks/stats
 * 获取任务统计信息
 */
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const stats = await TaskModel.getStats(userId);

        res.json({
            success: true,
            data: { stats },
        });
    } catch (error) {
        console.error('[Tasks] 获取统计错误:', error);
        res.status(500).json({
            success: false,
            message: '获取任务统计失败',
        });
    }
});

/**
 * GET /api/v1/tasks/:id
 * 获取单个任务详情
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        const task = await TaskModel.findById(id, userId);

        if (!task) {
            res.status(404).json({
                success: false,
                message: '任务不存在',
            });
            return;
        }

        res.json({
            success: true,
            data: { task },
        });
    } catch (error) {
        console.error('[Tasks] 获取详情错误:', error);
        res.status(500).json({
            success: false,
            message: '获取任务详情失败',
        });
    }
});

/**
 * POST /api/v1/tasks
 * 创建任务
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        // 验证请求数据
        const validatedData = createTaskSchema.parse(req.body);

        // 创建任务
        const task = await TaskModel.create({
            user_id: userId,
            ...validatedData,
            deadline: validatedData.deadline,
        });

        res.status(201).json({
            success: true,
            message: '任务创建成功',
            data: { task },
        });
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({
                success: false,
                message: '请求参数错误',
                errors: error.issues.map((e) => ({
                    field: String(e.path.join('.')),
                    message: String(e.message),
                })),
            });
            return;
        }

        console.error('[Tasks] 创建错误:', error);
        res.status(500).json({
            success: false,
            message: '创建任务失败',
        });
    }
});

/**
 * PUT /api/v1/tasks/:id
 * 更新任务
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        // 验证请求数据
        const validatedData = updateTaskSchema.parse(req.body);

        // 检查任务是否存在
        const existingTask = await TaskModel.findById(id, userId);
        if (!existingTask) {
            res.status(404).json({
                success: false,
                message: '任务不存在',
            });
            return;
        }

        // 更新任务
        const task = await TaskModel.update(id, userId, validatedData);

        res.json({
            success: true,
            message: '任务更新成功',
            data: { task },
        });
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({
                success: false,
                message: '请求参数错误',
                errors: error.issues.map((e) => ({
                    field: String(e.path.join('.')),
                    message: String(e.message),
                })),
            });
            return;
        }

        console.error('[Tasks] 更新错误:', error);
        res.status(500).json({
            success: false,
            message: '更新任务失败',
        });
    }
});

/**
 * DELETE /api/v1/tasks/:id
 * 删除任务
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        // 检查任务是否存在
        const existingTask = await TaskModel.findById(id, userId);
        if (!existingTask) {
            res.status(404).json({
                success: false,
                message: '任务不存在',
            });
            return;
        }

        // 删除任务
        const deleted = await TaskModel.remove(id, userId);

        if (deleted) {
            res.json({
                success: true,
                message: '任务删除成功',
            });
        } else {
            res.status(500).json({
                success: false,
                message: '删除任务失败',
            });
        }
    } catch (error) {
        console.error('[Tasks] 删除错误:', error);
        res.status(500).json({
            success: false,
            message: '删除任务失败',
        });
    }
});

/**
 * PATCH /api/v1/tasks/:id/complete
 * 切换任务完成状态
 */
router.patch('/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        // 检查任务是否存在
        const existingTask = await TaskModel.findById(id, userId);
        if (!existingTask) {
            res.status(404).json({
                success: false,
                message: '任务不存在',
            });
            return;
        }

        // 切换完成状态
        const task = await TaskModel.toggleComplete(id, userId);

        res.json({
            success: true,
            message: task?.is_completed ? '任务已完成' : '任务已标记为未完成',
            data: { task },
        });
    } catch (error) {
        console.error('[Tasks] 切换完成状态错误:', error);
        res.status(500).json({
            success: false,
            message: '操作失败',
        });
    }
});

/**
 * POST /api/v1/tasks/batch-delete
 * 批量删除任务
 */
router.post('/batch-delete', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        // 验证请求数据
        const validatedData = batchDeleteTasksSchema.parse(req.body);

        // 批量删除
        const deletedCount = await TaskModel.batchRemove(validatedData.ids, userId);

        res.json({
            success: true,
            message: `成功删除 ${deletedCount} 个任务`,
            data: { deletedCount },
        });
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({
                success: false,
                message: '请求参数错误',
                errors: error.issues.map((e) => ({
                    field: String(e.path.join('.')),
                    message: String(e.message),
                })),
            });
            return;
        }

        console.error('[Tasks] 批量删除错误:', error);
        res.status(500).json({
            success: false,
            message: '批量删除失败',
        });
    }
});

/**
 * POST /api/v1/tasks/batch-complete
 * 批量完成任务
 */
router.post('/batch-complete', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        // 验证请求数据
        const validatedData = batchCompleteTasksSchema.parse(req.body);

        // 批量完成
        const updatedCount = await TaskModel.batchComplete(validatedData.ids, userId);

        res.json({
            success: true,
            message: `成功完成 ${updatedCount} 个任务`,
            data: { updatedCount },
        });
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({
                success: false,
                message: '请求参数错误',
                errors: error.issues.map((e) => ({
                    field: String(e.path.join('.')),
                    message: String(e.message),
                })),
            });
            return;
        }

        console.error('[Tasks] 批量完成错误:', error);
        res.status(500).json({
            success: false,
            message: '批量完成失败',
        });
    }
});

/**
 * POST /api/v1/tasks/:id/open-links
 * 一键打开任务关联链接（返回链接列表供前端打开）
 */
router.post('/:id/open-links', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        const task = await TaskModel.findById(id, userId);

        if (!task) {
            res.status(404).json({
                success: false,
                message: '任务不存在',
            });
            return;
        }

        if (!task.links || task.links.length === 0) {
            res.json({
                success: false,
                message: '该任务没有关联链接',
                data: { links: [] },
            });
            return;
        }

        // 限制打开数量
        const maxOpenLinks = 5;
        const linksToOpen = task.links.slice(0, maxOpenLinks);
        const skipped = task.links.length - linksToOpen.length;

        res.json({
            success: true,
            message: skipped > 0 ? `已获取 ${linksToOpen.length} 个链接，${skipped} 个链接未打开（超过限制）` : '已获取所有关联链接',
            data: {
                links: linksToOpen,
                total: task.links.length,
                opened: linksToOpen.length,
                skipped,
            },
        });
    } catch (error) {
        console.error('[Tasks] 打开链接错误:', error);
        res.status(500).json({
            success: false,
            message: '操作失败',
        });
    }
});

export default router;
