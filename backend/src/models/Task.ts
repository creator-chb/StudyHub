/**
 * 任务模型
 * 提供任务的数据库操作
 */

import { query } from '../db/index.js';

// ============================================
// 类型定义
// ============================================

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

// ============================================
// 查询函数
// ============================================

/**
 * 获取用户的任务列表
 */
export async function findByUserId(
    userId: string,
    filter?: TaskFilter,
    pagination?: PaginationOptions
): Promise<{ tasks: TaskWithLinks[]; total: number }> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE t.user_id = $1';
    const params: (string | boolean | number)[] = [userId];
    let paramIndex = 2;

    // 状态过滤
    if (filter?.status === 'pending') {
        whereClause += ` AND t.is_completed = false`;
    } else if (filter?.status === 'completed') {
        whereClause += ` AND t.is_completed = true`;
    }

    // 优先级过滤
    if (filter?.priority) {
        whereClause += ` AND t.priority = $${paramIndex++}`;
        params.push(filter.priority);
    }

    // 搜索过滤
    if (filter?.search) {
        whereClause += ` AND (t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
        params.push(`%${filter.search}%`);
        paramIndex++;
    }

    // 获取总数
    const countResult = await query(
        `SELECT COUNT(*) as total FROM tasks t ${whereClause}`,
        params.slice(0, paramIndex - 1)
    );
    const total = parseInt((countResult[0] as { total: string }).total, 10);

    // 获取分页数据
    const queryParams = [...params, limit, offset];
    const rows = await query(
        `SELECT t.* 
         FROM tasks t
         ${whereClause}
         ORDER BY t.is_completed ASC, 
                  CASE t.priority 
                      WHEN 'high' THEN 3 
                      WHEN 'medium' THEN 2 
                      WHEN 'low' THEN 1 
                  END DESC,
                  t.deadline ASC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        queryParams
    );

    // 获取每个任务的链接
    const tasks: TaskWithLinks[] = [];
    for (const row of rows as Task[]) {
        const links = await getTaskLinks(row.id);
        tasks.push({
            ...row,
            links,
        });
    }

    return { tasks, total };
}

/**
 * 根据 ID 查找任务
 */
export async function findById(id: string, userId: string): Promise<TaskWithLinks | null> {
    const rows = await query(
        'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
        [id, userId]
    );

    if (rows.length === 0) {
        return null;
    }

    const task = rows[0] as Task;
    const links = await getTaskLinks(task.id);

    return {
        ...task,
        links,
    };
}

/**
 * 获取任务的链接列表
 */
async function getTaskLinks(taskId: string): Promise<string[]> {
    const rows = await query(
        'SELECT url FROM task_links WHERE task_id = $1 ORDER BY sort_order ASC',
        [taskId]
    );
    return (rows as { url: string }[]).map(row => row.url);
}

// ============================================
// 创建、更新、删除
// ============================================

/**
 * 创建新任务
 */
export async function create(input: CreateTaskInput): Promise<TaskWithLinks> {
    const {
        user_id,
        name,
        description = null,
        deadline,
        priority = 'medium',
        links = [],
    } = input;

    // 创建任务
    const rows = await query(
        `INSERT INTO tasks (user_id, name, description, deadline, priority)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user_id, name, description, deadline, priority]
    );

    const task = rows[0] as Task;

    // 添加链接
    if (links.length > 0) {
        await addTaskLinks(task.id, links);
    }

    return {
        ...task,
        links,
    };
}

/**
 * 更新任务
 */
export async function update(id: string, userId: string, input: UpdateTaskInput): Promise<TaskWithLinks | null> {
    const updates: string[] = [];
    const values: (string | boolean | null | Date)[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
    }
    if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(input.description || null);
    }
    if (input.deadline !== undefined) {
        updates.push(`deadline = $${paramIndex++}`);
        values.push(new Date(input.deadline));
    }
    if (input.priority !== undefined) {
        updates.push(`priority = $${paramIndex++}`);
        values.push(input.priority);
    }

    // 如果有更新字段
    if (updates.length > 0) {
        values.push(id, userId);
        const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`;

        const rows = await query(sql, values);
        if (rows.length === 0) {
            return null;
        }
    }

    // 更新链接（如果提供了 links）
    if (input.links !== undefined) {
        await updateTaskLinks(id, input.links);
    }

    return findById(id, userId);
}

/**
 * 删除任务
 */
export async function remove(id: string, userId: string): Promise<boolean> {
    const result = await query(
        'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
    );
    return result.length > 0;
}

/**
 * 批量删除任务
 */
export async function batchRemove(ids: string[], userId: string): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
    const result = await query(
        `DELETE FROM tasks WHERE id IN (${placeholders}) AND user_id = $1 RETURNING id`,
        [userId, ...ids]
    );
    return result.length;
}

// ============================================
// 状态切换
// ============================================

/**
 * 切换任务完成状态
 */
export async function toggleComplete(id: string, userId: string): Promise<TaskWithLinks | null> {
    const rows = await query(
        `UPDATE tasks
         SET is_completed = NOT is_completed,
             completed_at = CASE WHEN NOT is_completed THEN current_timestamp ELSE NULL END
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, userId]
    );

    if (rows.length === 0) {
        return null;
    }

    const task = rows[0] as Task;
    const links = await getTaskLinks(task.id);

    return {
        ...task,
        links,
    };
}

/**
 * 批量完成任务
 */
export async function batchComplete(ids: string[], userId: string): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
    const result = await query(
        `UPDATE tasks
         SET is_completed = true, completed_at = current_timestamp
         WHERE id IN (${placeholders}) AND user_id = $1 AND is_completed = false
         RETURNING id`,
        [userId, ...ids]
    );
    return result.length;
}

// ============================================
// 链接管理
// ============================================

/**
 * 添加任务链接
 */
async function addTaskLinks(taskId: string, links: string[]): Promise<void> {
    for (let i = 0; i < links.length; i++) {
        await query(
            `INSERT INTO task_links (task_id, url, sort_order)
             VALUES ($1, $2, $3)`,
            [taskId, links[i], i]
        );
    }
}

/**
 * 更新任务链接（删除旧的，添加新的）
 */
async function updateTaskLinks(taskId: string, links: string[]): Promise<void> {
    // 删除旧链接
    await query('DELETE FROM task_links WHERE task_id = $1', [taskId]);

    // 添加新链接
    if (links.length > 0) {
        await addTaskLinks(taskId, links);
    }
}

// ============================================
// 统计
// ============================================

/**
 * 获取用户任务统计
 */
export async function getStats(userId: string): Promise<TaskStats> {
    const now = new Date();

    // 获取基本统计
    const statsResult = await query(
        `SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_completed = false) as pending,
            COUNT(*) FILTER (WHERE is_completed = true) as completed,
            COUNT(*) FILTER (WHERE is_completed = false AND deadline < $2) as overdue,
            COUNT(*) FILTER (WHERE is_completed = false AND deadline >= $2 AND deadline < $3) as urgent,
            COUNT(*) FILTER (WHERE priority = 'high' AND is_completed = false) as high_priority,
            COUNT(*) FILTER (WHERE priority = 'medium' AND is_completed = false) as medium_priority,
            COUNT(*) FILTER (WHERE priority = 'low' AND is_completed = false) as low_priority
         FROM tasks
         WHERE user_id = $1`,
        [userId, now, new Date(now.getTime() + 24 * 60 * 60 * 1000)] // 24小时内的为紧急
    );

    const stats = statsResult[0] as {
        total: string;
        pending: string;
        completed: string;
        overdue: string;
        urgent: string;
        high_priority: string;
        medium_priority: string;
        low_priority: string;
    };

    return {
        total: parseInt(stats.total, 10),
        pending: parseInt(stats.pending, 10),
        completed: parseInt(stats.completed, 10),
        overdue: parseInt(stats.overdue, 10),
        urgent: parseInt(stats.urgent, 10),
        byPriority: {
            high: parseInt(stats.high_priority, 10),
            medium: parseInt(stats.medium_priority, 10),
            low: parseInt(stats.low_priority, 10),
        },
    };
}

/**
 * 获取用户的任务数量
 */
export async function countByUserId(userId: string): Promise<number> {
    const rows = await query(
        'SELECT COUNT(*) as count FROM tasks WHERE user_id = $1',
        [userId]
    );
    return parseInt((rows[0] as { count: string }).count, 10);
}
