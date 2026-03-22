"use strict";
/**
 * 数据验证工具
 * 使用 Zod 进行请求参数校验
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchDeleteSchema = exports.linkFilterSchema = exports.updateLinkSchema = exports.createLinkSchema = exports.updateCategorySchema = exports.createCategorySchema = void 0;
const zod_1 = require("zod");
// ============================================
// 分类验证
// ============================================
exports.createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, '分类名称不能为空').max(100, '分类名称最多 100 个字符'),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/, '颜色格式无效').optional(),
    icon: zod_1.z.string().max(50, '图标名称最多 50 个字符').optional(),
    sort_order: zod_1.z.number().int().default(0),
});
exports.updateCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, '分类名称不能为空').max(100, '分类名称最多 100 个字符').optional(),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/, '颜色格式无效').optional().nullable(),
    icon: zod_1.z.string().max(50, '图标名称最多 50 个字符').optional().nullable(),
    sort_order: zod_1.z.number().int().optional(),
});
// ============================================
// 链接验证
// ============================================
const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
exports.createLinkSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, '标题不能为空').max(255, '标题最多 255 个字符'),
    url: zod_1.z.string().regex(urlRegex, 'URL 格式无效'),
    description: zod_1.z.string().max(1000, '描述最多 1000 个字符').optional(),
    category_id: zod_1.z.string().uuid('分类 ID 格式无效').optional().nullable(),
    is_pinned: zod_1.z.boolean().default(false),
});
exports.updateLinkSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, '标题不能为空').max(255, '标题最多 255 个字符').optional(),
    url: zod_1.z.string().regex(urlRegex, 'URL 格式无效').optional(),
    description: zod_1.z.string().max(1000, '描述最多 1000 个字符').optional().nullable(),
    category_id: zod_1.z.string().uuid('分类 ID 格式无效').optional().nullable(),
    is_pinned: zod_1.z.boolean().optional(),
});
exports.linkFilterSchema = zod_1.z.object({
    category_id: zod_1.z.string().uuid().optional(),
    is_pinned: zod_1.z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.batchDeleteSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string().uuid()).min(1, '至少选择一个链接'),
});
//# sourceMappingURL=validation.js.map