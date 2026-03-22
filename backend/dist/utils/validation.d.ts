/**
 * 数据验证工具
 * 使用 Zod 进行请求参数校验
 */
import { z } from 'zod';
export declare const createCategorySchema: z.ZodObject<{
    name: z.ZodString;
    color: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    sort_order: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateCategorySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    color: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    icon: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sort_order: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const createLinkSchema: z.ZodObject<{
    title: z.ZodString;
    url: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    category_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    is_pinned: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const updateLinkSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    category_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    is_pinned: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const linkFilterSchema: z.ZodObject<{
    category_id: z.ZodOptional<z.ZodString>;
    is_pinned: z.ZodOptional<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<boolean, "true" | "false">>>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const batchDeleteSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const createTaskSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    deadline: z.ZodString;
    priority: z.ZodDefault<z.ZodEnum<{
        high: "high";
        medium: "medium";
        low: "low";
    }>>;
    links: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const updateTaskSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    deadline: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodEnum<{
        high: "high";
        medium: "medium";
        low: "low";
    }>>;
    links: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const taskFilterSchema: z.ZodObject<{
    status: z.ZodDefault<z.ZodEnum<{
        pending: "pending";
        completed: "completed";
        all: "all";
    }>>;
    priority: z.ZodOptional<z.ZodEnum<{
        high: "high";
        medium: "medium";
        low: "low";
    }>>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const batchDeleteTasksSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const batchCompleteTasksSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
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
//# sourceMappingURL=validation.d.ts.map