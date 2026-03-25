/**
 * 分类管理路由
 * 处理分类的 CRUD 操作
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import * as CategoryModel from '../models/Category.js';
import { createCategorySchema, updateCategorySchema } from '../utils/validation.js';
import { ZodError } from 'zod';
import { clearResponseCache } from '../middleware/cache.js';

const router = Router();

/**
 * GET /api/v1/categories
 * 获取分类列表
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const categories = await CategoryModel.findByUserId(userId);

        res.json({
            success: true,
            data: {
                categories,
                total: categories.length,
            },
        });
    } catch (error) {
        console.error('[Categories] 获取列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取分类列表失败',
        });
    }
});

/**
 * POST /api/v1/categories
 * 创建分类
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        // 验证请求数据
        const validatedData = createCategorySchema.parse(req.body);

        // 检查分类名称是否已存在
        if (await CategoryModel.nameExists(userId, validatedData.name)) {
            res.status(409).json({
                success: false,
                message: '该分类名称已存在',
            });
            return;
        }

        // 创建分类
        const category = await CategoryModel.create({
            user_id: userId,
            ...validatedData,
        });

        res.status(201).json({
            success: true,
            message: '分类创建成功',
            data: { category },
        });
        clearResponseCache(userId).catch(err => console.error('[Categories] 清除缓存失败:', err));
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

        console.error('[Categories] 创建错误:', error);
        res.status(500).json({
            success: false,
            message: '创建分类失败',
        });
    }
});

/**
 * PUT /api/v1/categories/:id
 * 更新分类
 */
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        // 验证请求数据
        const validatedData = updateCategorySchema.parse(req.body);

        // 检查分类是否存在
        const existingCategory = await CategoryModel.findById(id, userId);
        if (!existingCategory) {
            res.status(404).json({
                success: false,
                message: '分类不存在',
            });
            return;
        }

        // 如果修改了名称，检查是否与其他分类冲突
        if (validatedData.name && validatedData.name !== existingCategory.name) {
            if (await CategoryModel.nameExists(userId, validatedData.name, id)) {
                res.status(409).json({
                    success: false,
                    message: '该分类名称已存在',
                });
                return;
            }
        }

        // 更新分类
        const category = await CategoryModel.update(id, userId, validatedData);

        res.json({
            success: true,
            message: '分类更新成功',
            data: { category },
        });
        clearResponseCache(userId).catch(err => console.error('[Categories] 清除缓存失败:', err));
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

        console.error('[Categories] 更新错误:', error);
        res.status(500).json({
            success: false,
            message: '更新分类失败',
        });
    }
});

/**
 * DELETE /api/v1/categories/:id
 * 删除分类
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        // 检查分类是否存在
        const existingCategory = await CategoryModel.findById(id, userId);
        if (!existingCategory) {
            res.status(404).json({
                success: false,
                message: '分类不存在',
            });
            return;
        }

        // 删除分类（关联的链接会自动将 category_id 设为 NULL）
        const deleted = await CategoryModel.remove(id, userId);

        if (deleted) {
            res.json({
                success: true,
                message: '分类删除成功',
            });
            clearResponseCache(userId).catch(err => console.error('[Categories] 清除缓存失败:', err));
        } else {
            res.status(500).json({
                success: false,
                message: '删除分类失败',
            });
        }
    } catch (error) {
        console.error('[Categories] 删除错误:', error);
        res.status(500).json({
            success: false,
            message: '删除分类失败',
        });
    }
});

export default router;
