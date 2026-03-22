"use strict";
/**
 * 分类管理路由
 * 处理分类的 CRUD 操作
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const CategoryModel = __importStar(require("../models/Category.js"));
const validation_js_1 = require("../utils/validation.js");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/categories
 * 获取分类列表
 */
router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const categories = await CategoryModel.findByUserId(userId);
        res.json({
            success: true,
            data: {
                categories,
                total: categories.length,
            },
        });
    }
    catch (error) {
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
router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        // 验证请求数据
        const validatedData = validation_js_1.createCategorySchema.parse(req.body);
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
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
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
router.put('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        // 验证请求数据
        const validatedData = validation_js_1.updateCategorySchema.parse(req.body);
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
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
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
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
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
        }
        else {
            res.status(500).json({
                success: false,
                message: '删除分类失败',
            });
        }
    }
    catch (error) {
        console.error('[Categories] 删除错误:', error);
        res.status(500).json({
            success: false,
            message: '删除分类失败',
        });
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map