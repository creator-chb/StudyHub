/**
 * 分类模型
 * 提供分类的数据库操作
 */
export interface Category {
    id: string;
    user_id: string;
    name: string;
    color: string | null;
    icon: string | null;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
}
export interface CreateCategoryInput {
    user_id: string;
    name: string;
    color?: string;
    icon?: string;
    sort_order?: number;
}
export interface UpdateCategoryInput {
    name?: string;
    color?: string | null;
    icon?: string | null;
    sort_order?: number;
}
/**
 * 获取用户的所有分类
 */
export declare function findByUserId(userId: string): Promise<Category[]>;
/**
 * 根据 ID 查找分类
 */
export declare function findById(id: string, userId: string): Promise<Category | null>;
/**
 * 检查分类名称是否已存在（同一用户下）
 */
export declare function nameExists(userId: string, name: string, excludeId?: string): Promise<boolean>;
/**
 * 创建新分类
 */
export declare function create(input: CreateCategoryInput): Promise<Category>;
/**
 * 更新分类
 */
export declare function update(id: string, userId: string, input: UpdateCategoryInput): Promise<Category | null>;
/**
 * 删除分类
 */
export declare function remove(id: string, userId: string): Promise<boolean>;
/**
 * 获取用户的分类数量
 */
export declare function countByUserId(userId: string): Promise<number>;
/**
 * 批量更新排序
 */
export declare function updateSortOrder(userId: string, sortOrders: {
    id: string;
    sort_order: number;
}[]): Promise<void>;
//# sourceMappingURL=Category.d.ts.map