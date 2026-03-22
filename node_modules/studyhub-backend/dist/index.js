"use strict";
/**
 * StudyHub 后端服务入口
 * Phase 3: 任务管理后端化
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const index_js_1 = __importDefault(require("./config/index.js"));
const health_js_1 = __importDefault(require("./routes/health.js"));
const index_js_2 = __importDefault(require("./routes/auth/index.js"));
const categories_js_1 = __importDefault(require("./routes/categories.js"));
const links_js_1 = __importDefault(require("./routes/links.js"));
const tasks_js_1 = __importDefault(require("./routes/tasks.js"));
const logger_js_1 = require("./middleware/logger.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const app = (0, express_1.default)();
// =============================================
// 中间件
// =============================================
// CORS
app.use((0, cors_1.default)({
    origin: index_js_1.default.frontendUrl,
    credentials: true,
}));
// 请求体解析
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 请求日志
app.use(logger_js_1.requestLogger);
// =============================================
// 路由
// =============================================
app.use('/api', health_js_1.default);
app.use('/api/v1/auth', index_js_2.default);
app.use('/api/v1/categories', categories_js_1.default);
app.use('/api/v1/links', links_js_1.default);
app.use('/api/v1/tasks', tasks_js_1.default);
// 404 处理
app.use(errorHandler_js_1.notFoundHandler);
// 全局错误处理
app.use(errorHandler_js_1.errorHandler);
// =============================================
// 启动服务
// =============================================
app.listen(index_js_1.default.port, () => {
    console.log(`StudyHub 后端服务运行在 http://localhost:${index_js_1.default.port}`);
    console.log(`允许跨域来源：${index_js_1.default.frontendUrl}`);
    console.log(`当前阶段：Phase 3 - 任务管理后端化`);
    console.log(`环境：${index_js_1.default.nodeEnv}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map