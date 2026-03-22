/**
 * 链接管理路由
 * 处理链接的 CRUD 操作
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import * as LinkModel from '../models/Link.js';
import {
    createLinkSchema,
    updateLinkSchema,
    linkFilterSchema,
    batchDeleteSchema,
} from '../utils/validation.js';
import { ZodError } from 'zod';

const router = Router();

/**
 * GET /api/v1/links
 * 获取链接列表（支持筛选、分页）
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        // 验证查询参数
        const validatedQuery = linkFilterSchema.parse(req.query);

        const filter: LinkModel.LinkFilter = {};
        if (validatedQuery.category_id) {
            filter.category_id = validatedQuery.category_id;
        }
        if (validatedQuery.is_pinned !== undefined) {
            filter.is_pinned = validatedQuery.is_pinned;
        }
        if (validatedQuery.search) {
            filter.search = validatedQuery.search;
        }

        const pagination = {
            page: validatedQuery.page,
            limit: validatedQuery.limit,
        };

        const { links, total } = await LinkModel.findByUserId(userId, filter, pagination);

        res.json({
            success: true,
            data: {
                links,
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

        console.error('[Links] 获取列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取链接列表失败',
        });
    }
});

/**
 * GET /api/v1/links/pinned
 * 获取置顶链接
 */
router.get('/pinned', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const limit = parseInt(req.query.limit as string) || 10;

        const links = await LinkModel.findPinnedByUserId(userId, limit);

        res.json({
            success: true,
            data: { links },
        });
    } catch (error) {
        console.error('[Links] 获取置顶链接错误:', error);
        res.status(500).json({
            success: false,
            message: '获取置顶链接失败',
        });
    }
});

/**
 * GET /api/v1/links/:id
 * 获取单个链接详情
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        const link = await LinkModel.findById(id, userId);

        if (!link) {
            res.status(404).json({
                success: false,
                message: '链接不存在',
            });
            return;
        }

        res.json({
            success: true,
            data: { link },
        });
    } catch (error) {
        console.error('[Links] 获取详情错误:', error);
        res.status(500).json({
            success: false,
            message: '获取链接详情失败',
        });
    }
});

/**
 * POST /api/v1/links
 * 创建链接
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        // 验证请求数据
        const validatedData = createLinkSchema.parse(req.body);

        // 检查 URL 是否已存在
        if (await LinkModel.urlExists(userId, validatedData.url)) {
            res.status(409).json({
                success: false,
                message: '该链接已存在',
            });
            return;
        }

        // 创建链接
        const link = await LinkModel.create({
            user_id: userId,
            ...validatedData,
        });

        res.status(201).json({
            success: true,
            message: '链接创建成功',
            data: { link },
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

        console.error('[Links] 创建错误:', error);
        res.status(500).json({
            success: false,
            message: '创建链接失败',
        });
    }
});

/**
 * PUT /api/v1/links/:id
 * 更新链接
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        // 验证请求数据
        const validatedData = updateLinkSchema.parse(req.body);

        // 检查链接是否存在
        const existingLink = await LinkModel.findById(id, userId);
        if (!existingLink) {
            res.status(404).json({
                success: false,
                message: '链接不存在',
            });
            return;
        }

        // 如果修改了 URL，检查是否与其他链接冲突
        if (validatedData.url && validatedData.url !== existingLink.url) {
            if (await LinkModel.urlExists(userId, validatedData.url, id)) {
                res.status(409).json({
                    success: false,
                    message: '该链接已存在',
                });
                return;
            }
        }

        // 更新链接
        const link = await LinkModel.update(id, userId, validatedData);

        res.json({
            success: true,
            message: '链接更新成功',
            data: { link },
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

        console.error('[Links] 更新错误:', error);
        res.status(500).json({
            success: false,
            message: '更新链接失败',
        });
    }
});

/**
 * DELETE /api/v1/links/:id
 * 删除链接
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        // 检查链接是否存在
        const existingLink = await LinkModel.findById(id, userId);
        if (!existingLink) {
            res.status(404).json({
                success: false,
                message: '链接不存在',
            });
            return;
        }

        // 删除链接
        const deleted = await LinkModel.remove(id, userId);

        if (deleted) {
            res.json({
                success: true,
                message: '链接删除成功',
            });
        } else {
            res.status(500).json({
                success: false,
                message: '删除链接失败',
            });
        }
    } catch (error) {
        console.error('[Links] 删除错误:', error);
        res.status(500).json({
            success: false,
            message: '删除链接失败',
        });
    }
});

/**
 * PATCH /api/v1/links/:id/pin
 * 切换置顶状态
 */
router.patch('/:id/pin', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        // 检查链接是否存在
        const existingLink = await LinkModel.findById(id, userId);
        if (!existingLink) {
            res.status(404).json({
                success: false,
                message: '链接不存在',
            });
            return;
        }

        // 切换置顶状态
        const link = await LinkModel.togglePin(id, userId);

        res.json({
            success: true,
            message: link?.is_pinned ? '链接已置顶' : '链接已取消置顶',
            data: { link },
        });
    } catch (error) {
        console.error('[Links] 切换置顶错误:', error);
        res.status(500).json({
            success: false,
            message: '操作失败',
        });
    }
});

/**
 * POST /api/v1/links/batch-delete
 * 批量删除链接
 */
router.post('/batch-delete', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        // 验证请求数据
        const validatedData = batchDeleteSchema.parse(req.body);

        // 批量删除
        const deletedCount = await LinkModel.batchRemove(validatedData.ids, userId);

        res.json({
            success: true,
            message: `成功删除 ${deletedCount} 个链接`,
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

        console.error('[Links] 批量删除错误:', error);
        res.status(500).json({
            success: false,
            message: '批量删除失败',
        });
    }
});

/**
 * POST /api/v1/links/:id/click
 * 记录链接点击（可选，用于统计）
 */
router.post('/:id/click', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        // 检查链接是否存在
        const existingLink = await LinkModel.findById(id, userId);
        if (!existingLink) {
            res.status(404).json({
                success: false,
                message: '链接不存在',
            });
            return;
        }

        // 记录点击
        await LinkModel.recordClick(id, userId);

        res.json({
            success: true,
            message: '点击已记录',
        });
    } catch (error) {
        console.error('[Links] 记录点击错误:', error);
        res.status(500).json({
            success: false,
            message: '操作失败',
        });
    }
});

export default router;
