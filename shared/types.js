/**
 * StudyHub 共享类型定义
 * 前后端共用的数据结构规范（使用 JSDoc @typedef）
 * Phase 1 实现后，后端 API 请求/响应将遵循此规范
 * @module SharedTypes
 */

// =============================================
// 链接相关
// =============================================

/**
 * 链接对象
 * @typedef {Object} LinkItem
 * @property {string} id - 唯一标识符
 * @property {string} name - 链接名称（1-50 字符）
 * @property {string} url - 链接地址（必须以 http:// 或 https:// 开头）
 * @property {string} categoryId - 所属分类 ID（默认 'default'）
 * @property {boolean} pinned - 是否置顶
 * @property {number|null} pinnedAt - 置顶时间戳（毫秒），未置顶时为 null
 * @property {string} createdAt - 创建时间（ISO 8601 格式）
 * @property {string} [updatedAt] - 更新时间（ISO 8601 格式）
 */

// =============================================
// 任务相关
// =============================================

/**
 * 任务优先级
 * @typedef {'high' | 'medium' | 'low'} TaskPriority
 */

/**
 * 任务对象
 * @typedef {Object} TaskItem
 * @property {string} id - 唯一标识符
 * @property {string} name - 任务名称（1-100 字符）
 * @property {string} time - 截止时间（ISO 8601 格式，如 '2026-03-20T10:00'）
 * @property {TaskPriority} priority - 优先级
 * @property {string[]} links - 关联链接 URL 列表（最多 10 条）
 * @property {boolean} completed - 是否已完成
 * @property {string|null} completedAt - 完成时间（ISO 8601），未完成时为 null
 * @property {string} createdAt - 创建时间（ISO 8601 格式）
 * @property {string} [updatedAt] - 更新时间（ISO 8601 格式）
 */

// =============================================
// 分类相关
// =============================================

/**
 * 分类对象
 * @typedef {Object} CategoryItem
 * @property {string} id - 唯一标识符
 * @property {string} name - 分类名称
 * @property {string} color - 分类颜色（十六进制，如 '#4f8cff'）
 */

// =============================================
// 存储/导出相关
// =============================================

/**
 * 完整数据导出对象
 * @typedef {Object} StorageData
 * @property {string} version - 数据格式版本号
 * @property {string} exportTime - 导出时间（ISO 8601 格式）
 * @property {LinkItem[]} links - 链接列表
 * @property {TaskItem[]} tasks - 任务列表
 * @property {CategoryItem[]} categories - 分类列表
 * @property {Object} settings - 应用设置
 */

// =============================================
// API 响应（Phase 1 预留）
// =============================================

/**
 * 通用 API 响应格式
 * @typedef {Object} ApiResponse
 * @property {boolean} success - 是否成功
 * @property {*} [data] - 响应数据
 * @property {string} [message] - 提示信息
 * @property {string[]} [errors] - 错误信息列表
 */

/**
 * 分页数据响应
 * @typedef {Object} PaginatedResponse
 * @property {boolean} success - 是否成功
 * @property {*[]} data - 数据列表
 * @property {Object} pagination - 分页信息
 * @property {number} pagination.page - 当前页码（从 1 开始）
 * @property {number} pagination.pageSize - 每页条数
 * @property {number} pagination.total - 总条数
 * @property {number} pagination.totalPages - 总页数
 */

// 导出（Node.js 环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {};
}
