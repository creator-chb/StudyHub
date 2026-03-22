/**
 * StudyHub 后端服务入口
 * Phase 2: 链接管理后端化
 */

import express, { Express } from 'express';
import cors from 'cors';
import config from './config/index.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth/index.js';
import categoriesRouter from './routes/categories.js';
import linksRouter from './routes/links.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app: Express = express();

// =============================================
// 中间件
// =============================================

// CORS
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
}));

// 请求体解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use(requestLogger);

// =============================================
// 路由
// =============================================

app.use('/api', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/links', linksRouter);

// 404 处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// =============================================
// 启动服务
// =============================================

app.listen(config.port, () => {
    console.log(`StudyHub 后端服务运行在 http://localhost:${config.port}`);
    console.log(`允许跨域来源：${config.frontendUrl}`);
    console.log(`当前阶段：Phase 2 - 链接管理后端化`);
    console.log(`环境：${config.nodeEnv}`);
});

export default app;
