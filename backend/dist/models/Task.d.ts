/**
 * 任务模型
 * 提供任务的数据库操作
 */
export interface Task {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    deadline: Date;
    priority: 'high' | 'medium' | 'low';
    is_completed: boolean;
    completed_at: Date | null;
    created_at: Date;
    updated_at: Date;
}
export interface TaskLink {
    id: string;
    task_id: string;
    link_id: string | null;
    url: string;
    sort_order: number;
    created_at: Date;
}
export interface TaskWithLinks extends Task {
    links: string[];
}
export interface CreateTaskInput {
    user_id: string;
    name: string;
    description?: string;
    deadline: Date | string;
    priority?: 'high' | 'medium' | 'low';
    links?: string[];
}
export interface UpdateTaskInput {
    name?: string;
    description?: string | null;
    deadline?: Date | string;
    priority?: 'high' | 'medium' | 'low';
    links?: string[];
    is_completed?: boolean;
}
export interface TaskFilter {
    status?: 'pending' | 'completed' | 'all';
    priority?: 'high' | 'medium' | 'low';
    search?: string;
}
export interface PaginationOptions {
    page?: number;
    limit?: number;
}
export interface TaskStats {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    urgent: number;
    byPriority: {
        high: number;
        medium: number;
        low: number;
    };
}
/**
 * 获取用户的任务列表
 */
export declare function findByUserId(userId: string, filter?: TaskFilter, pagination?: PaginationOptions): Promise<{
    tasks: TaskWithLinks[];
    total: number;
}>;
/**
 * 根据 ID 查找任务
 */
export declare function findById(id: string, userId: string): Promise<TaskWithLinks | null>;
/**
 * 创建新任务
 */
export declare function create(input: CreateTaskInput): Promise<TaskWithLinks>;
/**
 * 更新任务
 */
export declare function update(id: string, userId: string, input: UpdateTaskInput): Promise<TaskWithLinks | null>;
/**
 * 删除任务
 */
export declare function remove(id: string, userId: string): Promise<boolean>;
/**
 * 批量删除任务
 */
export declare function batchRemove(ids: string[], userId: string): Promise<number>;
/**
 * 切换任务完成状态
 */
export declare function toggleComplete(id: string, userId: string): Promise<TaskWithLinks | null>;
/**
 * 批量完成任务
 */
export declare function batchComplete(ids: string[], userId: string): Promise<number>;
/**
 * 获取用户任务统计
 */
export declare function getStats(userId: string): Promise<TaskStats>;
/**
 * 获取用户的任务数量
 */
export declare function countByUserId(userId: string): Promise<number>;
//# sourceMappingURL=Task.d.ts.map