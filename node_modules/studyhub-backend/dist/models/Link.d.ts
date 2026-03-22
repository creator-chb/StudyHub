/**
 * 链接模型
 * 提供链接的数据库操作
 */
export interface Link {
    id: string;
    user_id: string;
    category_id: string | null;
    title: string;
    url: string;
    description: string | null;
    is_pinned: boolean;
    click_count: number;
    last_clicked_at: Date | null;
    created_at: Date;
    updated_at: Date;
}
export interface LinkWithCategory extends Link {
    category_name: string | null;
    category_color: string | null;
}
export interface CreateLinkInput {
    user_id: string;
    category_id?: string | null;
    title: string;
    url: string;
    description?: string;
    is_pinned?: boolean;
}
export interface UpdateLinkInput {
    category_id?: string | null;
    title?: string;
    url?: string;
    description?: string | null;
    is_pinned?: boolean;
}
export interface LinkFilter {
    category_id?: string;
    is_pinned?: boolean;
    search?: string;
}
export interface PaginationOptions {
    page?: number;
    limit?: number;
}
/**
 * 获取用户的链接列表
 */
export declare function findByUserId(userId: string, filter?: LinkFilter, pagination?: PaginationOptions): Promise<{
    links: LinkWithCategory[];
    total: number;
}>;
/**
 * 根据 ID 查找链接
 */
export declare function findById(id: string, userId: string): Promise<LinkWithCategory | null>;
/**
 * 检查 URL 是否已存在（同一用户下）
 */
export declare function urlExists(userId: string, url: string, excludeId?: string): Promise<boolean>;
/**
 * 根据 URL 查找链接
 */
export declare function findByUrl(userId: string, url: string): Promise<Link | null>;
/**
 * 创建新链接
 */
export declare function create(input: CreateLinkInput): Promise<Link>;
/**
 * 更新链接
 */
export declare function update(id: string, userId: string, input: UpdateLinkInput): Promise<Link | null>;
/**
 * 删除链接
 */
export declare function remove(id: string, userId: string): Promise<boolean>;
/**
 * 批量删除链接
 */
export declare function batchRemove(ids: string[], userId: string): Promise<number>;
/**
 * 切换置顶状态
 */
export declare function togglePin(id: string, userId: string): Promise<Link | null>;
/**
 * 记录点击
 */
export declare function recordClick(id: string, userId: string): Promise<void>;
/**
 * 获取用户的链接数量
 */
export declare function countByUserId(userId: string): Promise<number>;
/**
 * 获取置顶链接
 */
export declare function findPinnedByUserId(userId: string, limit?: number): Promise<LinkWithCategory[]>;
//# sourceMappingURL=Link.d.ts.map