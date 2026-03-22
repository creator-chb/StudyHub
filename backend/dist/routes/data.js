"use strict";
/**
 * 数据迁移路由
 * 处理数据导入导出操作
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
const rateLimiter_js_1 = require("../middleware/rateLimiter.js");
const LinkModel = __importStar(require("../models/Link.js"));
const CategoryModel = __importStar(require("../models/Category.js"));
const TaskModel = __importStar(require("../models/Task.js"));
const UserModel = __importStar(require("../models/User.js"));
const router = (0, express_1.Router)();
// =============================================
// 数据导出
// =============================================
/**
 * GET /api/v1/data/export
 * 导出用户数据
 */
router.get('/export', auth_js_1.authenticate, rateLimiter_js_1.exportRateLimiter, async (req, res) => {
    try {
        const userId = req.user.userId;
        const format = req.query.format || 'json';
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
        }
        else {
            res.status(400).json({
                success: false,
                message: '不支持的导出格式',
            });
        }
    }
    catch (error) {
        console.error('[Data] 导出错误:', error);
        res.status(500).json({
            success: false,
            message: '导出数据失败',
        });
    }
});
/**
 * POST /api/v1/data/import
 * 导入用户数据
 */
router.post('/import', auth_js_1.authenticate, rateLimiter_js_1.importRateLimiter, async (req, res) => {
    try {
        const userId = req.user.userId;
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
        const summary = {
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
    }
    catch (error) {
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
async function overwriteUserData(userId) {
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
async function importCategories(userId, categories, summary, strategy, _version) {
    for (const cat of categories) {
        try {
            const categoryData = cat;
            const name = categoryData.name || '';
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
                    color: categoryData.color,
                    icon: categoryData.icon,
                    sort_order: categoryData.sort_order,
                });
                summary.updated++;
            }
            else {
                // 创建新分类
                await CategoryModel.create({
                    user_id: userId,
                    name: name,
                    color: categoryData.color || '#4f8cff',
                    icon: categoryData.icon,
                    sort_order: categoryData.sort_order || 0,
                });
                summary.added++;
            }
        }
        catch (error) {
            summary.errors.push(`分类导入失败: ${error.message}`);
        }
    }
}
/**
 * 导入链接
 */
async function importLinks(userId, links, summary, strategy, _version) {
    for (const link of links) {
        try {
            const linkData = link;
            // 字段映射（v1.x -> v2.0）
            const title = linkData.title || linkData.name || '';
            const url = linkData.url || '';
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
                    description: linkData.description,
                    category_id: linkData.category_id,
                    is_pinned: linkData.is_pinned,
                });
                summary.updated++;
            }
            else {
                // 创建新链接
                await LinkModel.create({
                    user_id: userId,
                    title,
                    url,
                    description: linkData.description || '',
                    category_id: linkData.category_id || null,
                    is_pinned: linkData.is_pinned || false,
                });
                summary.added++;
            }
        }
        catch (error) {
            summary.errors.push(`链接导入失败: ${error.message}`);
        }
    }
}
/**
 * 导入任务
 */
async function importTasks(userId, tasks, summary, strategy, _version) {
    for (const task of tasks) {
        try {
            const taskData = task;
            const name = taskData.name || '';
            if (!name) {
                summary.errors.push('任务名称不能为空');
                continue;
            }
            // 处理截止时间字段映射
            const deadline = taskData.deadline || taskData.time;
            // 检查是否已存在（基于名称和截止时间）
            const { tasks: existingTasks } = await TaskModel.findByUserId(userId, { search: name }, { page: 1, limit: 10 });
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
                    description: taskData.description,
                    deadline,
                    priority: taskData.priority,
                    is_completed: taskData.is_completed,
                    links: taskData.links,
                });
                summary.updated++;
            }
            else {
                // 创建新任务
                await TaskModel.create({
                    user_id: userId,
                    name,
                    description: taskData.description || '',
                    deadline: deadline || new Date().toISOString(),
                    priority: taskData.priority || 'medium',
                    links: taskData.links || [],
                });
                summary.added++;
            }
        }
        catch (error) {
            summary.errors.push(`任务导入失败: ${error.message}`);
        }
    }
}
exports.default = router;
//# sourceMappingURL=data.js.map