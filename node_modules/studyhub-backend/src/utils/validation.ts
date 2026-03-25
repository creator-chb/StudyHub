/**
 * 数据验证工具
 * 使用 Zod 进行请求参数校验
 */

import { z } from 'zod';

// ============================================
// 分类验证
// ============================================

export const createCategorySchema = z.object({
    name: z.string().min(1, '分类名称不能为空').max(100, '分类名称最多 100 个字符'),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '颜色格式无效').optional(),
    icon: z.string().max(50, '图标名称最多 50 个字符').optional(),
    sort_order: z.number().int().default(0),
});

export const updateCategorySchema = z.object({
    name: z.string().min(1, '分类名称不能为空').max(100, '分类名称最多 100 个字符').optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '颜色格式无效').optional().nullable(),
    icon: z.string().max(50, '图标名称最多 50 个字符').optional().nullable(),
    sort_order: z.number().int().optional(),
});

// ============================================
// 链接验证
// ============================================

const urlRegex = /^https?:\/\/[^\s]+$/;

export const createLinkSchema = z.object({
    title: z.string().min(1, '标题不能为空').max(255, '标题最多 255 个字符'),
    url: z.string().regex(urlRegex, 'URL 格式无效'),
    description: z.string().max(1000, '描述最多 1000 个字符').optional(),
    category_id: z.string().uuid('分类 ID 格式无效').optional().nullable(),
    is_pinned: z.boolean().default(false),
});

export const updateLinkSchema = z.object({
    title: z.string().min(1, '标题不能为空').max(255, '标题最多 255 个字符').optional(),
    url: z.string().regex(urlRegex, 'URL 格式无效').optional(),
    description: z.string().max(1000, '描述最多 1000 个字符').optional().nullable(),
    category_id: z.string().uuid('分类 ID 格式无效').optional().nullable(),
    is_pinned: z.boolean().optional(),
});

export const linkFilterSchema = z.object({
    category_id: z.string().uuid().optional(),
    is_pinned: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const batchDeleteSchema = z.object({
    ids: z.array(z.string().uuid()).min(1, '至少选择一个链接'),
});

// ============================================
// 任务验证
// ============================================

export const createTaskSchema = z.object({
    name: z.string().min(1, '任务名称不能为空').max(100, '任务名称最多 100 个字符'),
    description: z.string().max(500, '描述最多 500 个字符').optional(),
    deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: '无效的截止时间',
    }),
    priority: z.enum(['high', 'medium', 'low']).default('medium'),
    links: z.array(z.string().regex(urlRegex, 'URL 格式无效')).max(10, '每个任务最多关联 10 个链接').optional(),
});

export const updateTaskSchema = z.object({
    name: z.string().min(1, '任务名称不能为空').max(100, '任务名称最多 100 个字符').optional(),
    description: z.string().max(500, '描述最多 500 个字符').optional().nullable(),
    deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: '无效的截止时间',
    }).optional(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    links: z.array(z.string().regex(urlRegex, 'URL 格式无效')).max(10, '每个任务最多关联 10 个链接').optional(),
});

export const taskFilterSchema = z.object({
    status: z.enum(['pending', 'completed', 'all']).default('all'),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const batchDeleteTasksSchema = z.object({
    ids: z.array(z.string().uuid()).min(1, '至少选择一个任务'),
});

export const batchCompleteTasksSchema = z.object({
    ids: z.array(z.string().uuid()).min(1, '至少选择一个任务'),
});

// ============================================
// 类型导出
// ============================================

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type LinkFilterInput = z.infer<typeof linkFilterSchema>;
export type BatchDeleteInput = z.infer<typeof batchDeleteSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
export type BatchDeleteTasksInput = z.infer<typeof batchDeleteTasksSchema>;
export type BatchCompleteTasksInput = z.infer<typeof batchCompleteTasksSchema>;
