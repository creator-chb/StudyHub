# StudyHub 更新日志

所有重要的项目变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [2.0.0-dev] - 2026-03-21

### 新增 ✨
- 🔗 **链接管理后端化（Phase 2）**
  - 分类表（categories）和链接表（links）数据库设计
  - `GET /api/v1/categories` - 获取分类列表
  - `POST /api/v1/categories` - 创建分类
  - `PUT /api/v1/categories/:id` - 更新分类
  - `DELETE /api/v1/categories/:id` - 删除分类
  - `GET /api/v1/links` - 获取链接列表（支持筛选、分页）
  - `GET /api/v1/links/pinned` - 获取置顶链接
  - `GET /api/v1/links/:id` - 获取单个链接详情
  - `POST /api/v1/links` - 创建链接
  - `PUT /api/v1/links/:id` - 更新链接
  - `DELETE /api/v1/links/:id` - 删除链接
  - `PATCH /api/v1/links/:id/pin` - 切换置顶状态
  - `POST /api/v1/links/batch-delete` - 批量删除链接
  - 请求参数校验（Zod 验证）
  - URL 格式验证和重复链接检测

### 新增基础设施 🔧
- 🗄️ **数据库扩展**
  - 分类表（categories）设计：支持名称、颜色、图标、排序
  - 链接表（links）设计：支持分类关联、置顶、点击统计
  - 外键关联和索引优化
  - 自动更新时间戳触发器

- 🛡️ **数据验证层**
  - Zod 验证库集成
  - 分类和链接的创建/更新验证 Schema
  - 统一的验证错误响应格式

### 优化 ⚡
- 📁 **模型层完善**
  - Category 模型：CRUD 操作、名称唯一性检查
  - Link 模型：CRUD 操作、URL 唯一性检查、批量删除、置顶切换

---

## [2.0.0-dev] - 2026-03-21

### 新增 ✨
- 📁 **HTML 文件结构规范化**
  - 创建 `legacy/` 目录归档历史版本
  - 移动 `studyhub.html` 到 `legacy/studyhub_v1_legacy.html`
  - 为归档文件添加详细的历史版本注释说明
  - 明确区分主入口文件和开发版本入口

- 🔐 **用户认证系统（Phase 1）**
  - 后端 Express + TypeScript 认证 API 完整实现
  - `POST /api/v1/auth/register` - 用户注册（邮箱验证、密码加密）
  - `POST /api/v1/auth/login` - 用户登录（JWT Token 签发）
  - `POST /api/v1/auth/refresh` - Token 自动刷新机制
  - `GET /api/v1/auth/me` - 获取当前用户信息
  - `POST /api/v1/auth/logout` - 用户登出（Token 撤销）
  - 前端 `api.js` - API 客户端封装，支持请求/响应拦截器
  - 前端 `auth.js` - 认证模块，提供登录/注册模态框 UI
  - JWT Token 存储管理（localStorage）
  - 认证状态持久化和自动恢复
  - 登录/登出 UI 动态更新

### 新增基础设施 🔧
- 🗄️ **PostgreSQL 数据库**
  - 用户表（users）设计和实现
  - 刷新令牌表（refresh_tokens）实现
  - 数据库迁移脚本（node-pg-migrate）
  - 数据库连接池配置

- 🔒 **JWT 认证中间件**
  - Token 验证中间件（`authenticate`）
  - 错误处理中间件（统一错误响应格式）
  - 请求日志中间件

### 优化 ⚡
- 📁 **backend/ 目录重构为 TypeScript**
  - `.ts` 文件替代 `.js` 文件
  - 完整的类型定义和接口
  - ESLint + Prettier 代码规范配置

---

## [2.0.0-dev] - 2026-03-20

### 新增 ✨
- 🏗️ **存储抽象层（Phase 0）**
  - 新增 `AbstractStorage` 基类，定义存储适配器接口规范
  - `get/set/remove/clear` 为抽象方法，子类必须实现
  - `subscribe/unsubscribe/_emit` 为共享事件系统实现
  - `exportAll/importAll/validateImport/formatBytes` 为共享辅助方法
- 💾 **LocalStorageAdapter**
  - 将原 `storage.js` 逻辑迁移为独立适配器
  - 实现 `AbstractStorage` 所有抽象方法
  - 路径：`frontend/src/js/modules/storage/LocalStorageAdapter.js`
- 🔀 **Storage 工厂模块**
  - `storage.js` 重构为工厂/代理，根据配置选择适配器
  - 通过 `Config.get('features.backendSync')` 控制
  - 当前始终返回 `LocalStorageAdapter`，后端同步将在 Phase 1 实现
- ⚙️ **features.backendSync 配置开关**
  - `config.js` 新增 `features` 配置节
  - `features.backendSync`（默认 false）：是否启用后端同步
  - `features.backendUrl`（默认 `http://localhost:3000`）：后端服务地址
  - 新增 `Config.isFeatureEnabled(feature)` 便捷方法

### 优化 ⚡
- 📁 **项目目录结构重组**
  - 前端代码迁移至 `frontend/` 目录（原 `src/` 目录）
  - 根级 `index.html` 更新脚本引用路径至 `frontend/src/...`
  - `frontend/index.html` 新增存储抽象层脚本加载顺序

### 新增基础设施 🔧
- 🖥️ **backend/ 后端骨架（Phase 0）**
  - `backend/package.json`：Express + cors + dotenv 依赖声明
  - `backend/src/index.js`：Express 应用入口，健康检查路由
  - `backend/src/routes/health.js`：`GET /api/health` 端点
  - `backend/.env.example`：环境变量配置模板（含 Phase 1 预留项）
- 🔗 **shared/ 共享类型定义**
  - `shared/types.js`：JSDoc `@typedef` 定义 LinkItem、TaskItem、CategoryItem、StorageData、ApiResponse 等
- 📦 **根级 package.json**
  - `npm run dev`：启动前端开发服务器
  - `npm run dev:frontend`：同上
  - `npm run dev:backend`：启动后端开发服务器
  - `npm run install:deps`：安装后端依赖

---

## [1.4.0] - 2026-03-20

### 新增 ✨
- 🌓 **深色模式支持**
  - 支持浅色/深色/跟随系统三种主题模式
  - 快捷键 `Ctrl+D` 快速切换主题
  - 主题偏好持久化到 localStorage
  - 完整的深色主题 CSS 变量体系

- 📊 **数据导入导出功能**
  - 支持 JSON 格式数据导出备份
  - 支持 JSON 格式数据导入恢复
  - 提供合并导入和覆盖导入两种模式
  - 导入数据格式验证和错误提示

- 🏷️ **链接分类系统**
  - 支持为链接设置分类（学习/工作/娱乐等）
  - 分类筛选功能
  - 分类颜色标识
  - 支持自定义分类管理

- 🎯 **任务优先级设置**
  - 支持高/中/低三种优先级
  - 优先级视觉标识（🔴🟡🟢）
  - 按优先级排序任务
  - 优先级筛选功能

- 📱 **移动端触摸优化**
  - 支持左滑删除手势
  - 长按操作支持
  - 触摸反馈优化

### 优化 ⚡
- 🏗️ **代码架构重构**
  - 单文件拆分为模块化结构
  - 使用 IIFE 模式封装模块
  - 消除全局变量污染
  - 完整的 JSDoc 类型注释

- 🎨 **UI 渲染优化**
  - 实现 requestAnimationFrame 批量渲染
  - 虚拟滚动支持（大数据量优化）
  - 减少不必要的 DOM 重绘

- ⌨️ **键盘导航增强**
  - 完整的键盘快捷键体系
  - 列表项键盘导航（上下箭头）
  - 快捷键提示和发现

- 🛡️ **错误处理机制**
  - 统一的错误捕获和处理
  - 全局错误监听
  - 用户友好的错误提示

### 技术债务 🔧
- 移除所有内联事件处理器（onclick）
- 统一使用 addEventListener
- 实现插件化架构基础
- 配置中心化管理

---

## [1.3.1] - 2026-03-20

### 修复 🐛
- **任务编辑时手动链接丢失问题**
  - 修复编辑任务时手动输入的链接无法回显的 bug
  - 现在编辑任务时会正确区分链接池链接和手动输入链接
  - 手动链接会正确回显到文本框中，保存时不会丢失

---

## [1.3.0] - 2026-03-20

### 新增 ✨
- 📌 **链接置顶功能**
  - 支持将常用链接置顶显示，置顶链接显示在最前面
  - 置顶链接金色边框高亮，视觉区分明显
  - 一键置顶/取消置顶，使用图钉图标操作
  - 置顶状态持久化到 localStorage

- ⌨️ **键盘快捷键支持**
  - 全局快捷键：`N` 新建链接，`T` 新建任务，`/` 聚焦搜索框
  - 链接池键盘导航：上下箭头切换，Enter 打开链接，Delete 删除链接
  - 任务列表键盘导航：上下箭头切换，Enter 一键跳转所有链接，Delete 删除任务
  - 所有列表项支持 Tab 聚焦，聚焦时有视觉反馈

- 🔍 **链接搜索功能**
  - 链接池添加实时搜索框，支持按名称和 URL 搜索
  - 搜索结果即时过滤显示
  - 搜索框占位符提示快捷键 `/`

### 优化 ⚡
- 📱 **移动端适配优化**
  - 小屏幕下模态框宽度自适应（90vw），内边距缩小
  - 链接网格最小列宽调整为 140px，超小屏幕单列显示
  - 任务关联链接 Chips 间距和字体优化
  - 按钮触摸区域保持 36px 以上，确保可点击性
  - 卡片头部在小屏下自动换行，搜索框全宽显示

---

## [1.2.0] - 2026-03-19

### 新增 ✨
- 🔔 **通知系统升级**
  - Toast/Snackbar 替代原生 alert（成功 2s，错误 3s）
  - 确认型 Dialog 替代 confirm（支持 ESC/遮罩关闭）
  - 统一提示文案与持续时间规范

- ✅ **表单校验增强**
  - URL 输入实时校验（失焦即校验），显示具体错误原因
  - 任务截止时间禁止选择过去时间，提交前二次确认
  - 必填项即时红字提示，不只在提交时报错

- 📊 **任务状态可视化**
  - 任务完成状态（复选标记），点击切换
  - 已完成项目自动置灰或归档到"已完成"分区
  - 动态显示"剩余时间"（如：剩余 2 天 3 小时）
  - 逾期后持续显示"已逾期 X 天"

### 优化 ⚡
- 任务按状态分区显示（进行中/已完成）

---

## [1.1.0] - 2026-03-19

### 优化 ⚡
- 🪟 **模态弹窗交互**
  - 链接管理与任务管理均改为模态卡片对话框形式，替代原有页内表单
  - 弹窗支持点击遮罩层或按 `ESC` 键关闭
  - 弹窗打开时自动聚焦第一个输入框，流畅的入场动画

- 🔗 **链接展示优化**
  - 改为响应式网格卡片布局（`auto-fill` 自适应列数）
  - 每张卡片显示链接名称，超长文字省略处理
  - 空状态友好提示

- 📋 **任务展示优化**
  - 任务卡片新增关联链接标签（Chip）预览
  - 逾期任务自动标红提示（⚠️ 已逾期），24小时内截止高亮
  - 空状态友好提示

- 🛡️ **数据安全**
  - 所有渲染内容改用 `escapeHtml` 防止 XSS 注入
  - 删除操作新增确认对话框

- ✅ **表单验证**
  - 链接地址格式验证（必须以 `http://` 或 `https://` 开头）
  - 编辑链接/任务时复用同一弹窗，回显已有数据

---

## [1.0.0] - 2026-03-19

### 新增 ✨
- 🔗 **链接池管理**
  - 添加、编辑、删除学习链接
  - 快速跳转到目标链接
  - 链接备注名称功能
  
- 📋 **任务管理**
  - 创建学习任务并设置截止时间
  - 关联多个学习链接
  - 一键批量打开所有链接
  - 按时间自动排序
  
- 💾 **数据持久化**
  - 使用 localStorage 本地存储
  - 页面刷新数据不丢失
  - 隐私安全（数据完全本地）

- 🎨 **用户界面**
  - 简洁美观的卡片式设计
  - 响应式布局
  - 流畅的交互体验
  - 实时反馈

### 技术实现 🔧
- 纯前端实现（HTML5 + CSS3 + JavaScript）
- 零依赖第三方库
- 模块化代码结构
- 事件驱动编程

### 文档 📝
- 创建 README.md
- 添加开发路线图（roadmap.md）
- 建立更新日志（changelog.md）

---

## 版本说明

### 版本号规则
- **主版本号 (Major)**: 不兼容的 API 修改（如 v1.x.x → v2.x.x）
- **次版本号 (Minor)**: 向下兼容的功能性新增（如 v1.1.x → v1.2.x）
- **修订号 (Patch)**: 向下兼容的问题修正（如 v1.0.1 → v1.0.2）

### 状态标识
- `🔒 安全` - 安全性修复
- `✨ 新增` - 新功能
- `🐛 修复` - Bug 修复
- `⚡ 优化` - 性能优化
- `🔧 技术` - 技术债务清理
- `📝 文档` - 文档更新
- `🚧 计划中` - 未来功能

---

## 贡献者

感谢所有为这个项目做出贡献的人！

- **chb** - 项目创始人 & 主要开发者

---

## 联系方式

如有问题或建议，请通过以下方式联系：

- **Email**: 2956529037@qq.com
- **GitHub Issues**: [提交 Issue](https://github.com/chb/StudyHub/issues)

---

**最后更新**: 2026-03-21（Phase 2 链接管理后端化完成）
