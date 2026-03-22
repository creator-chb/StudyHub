/**
 * 用户模型
 * 提供用户的数据库操作
 */
export interface User {
    id: string;
    email: string;
    username: string;
    password_hash: string;
    created_at: Date;
    updated_at: Date;
}
export interface CreateUserInput {
    email: string;
    username: string;
    password: string;
}
/**
 * 根据邮箱查找用户
 */
export declare function findByEmail(email: string): Promise<User | null>;
/**
 * 根据 ID 查找用户
 */
export declare function findById(id: string): Promise<User | null>;
/**
 * 根据用户名查找用户
 */
export declare function findByUsername(username: string): Promise<User | null>;
/**
 * 创建新用户
 */
export declare function create(input: CreateUserInput): Promise<User>;
/**
 * 验证用户密码
 */
export declare function verifyPassword(user: User, password: string): Promise<boolean>;
/**
 * 检查邮箱是否已存在
 */
export declare function emailExists(email: string): Promise<boolean>;
/**
 * 检查用户名是否已存在
 */
export declare function usernameExists(username: string): Promise<boolean>;
//# sourceMappingURL=User.d.ts.map