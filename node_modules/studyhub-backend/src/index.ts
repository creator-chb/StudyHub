/**
 * StudyHub 后端服务入口
 * Phase 6: 优化与发布
 */

import express, { Express } from 'express';
import cors from 'cors';
import compression from 'compression';
import config from './config/index.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth/index.js';
import categoriesRouter from './routes/categories.js';
import linksRouter from './routes/links.js';
import tasksRouter from './routes/tasks.js';
import dataRouter from './routes/data.js';
import swaggerRouter from './routes/swagger.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRateLimiter, apiRateLimiter } from './middleware/rateLimiter.js';
import { linksCache, categoriesCache, tasksCache } from './middleware/cache.js';
import { authenticate } from './middleware/auth.js';
import { sanitizeAll } from './middleware/sanitizer.js';
import { securityHeaders, detectSuspiciousRequest } from './middleware/security.js';
import { getCsrfToken, csrfProtection } from './middleware/csrf.js';

const app: Express = express();

// =============================================
// 中间件
// =============================================

// 安全响应头（Phase 6 安全加固）
app.use(securityHeaders);

// CORS
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
}));

// 响应压缩（Phase 6 性能优化）
app.use(compression({
    filter: (req: express.Request, res: express.Response) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    threshold: 1024, // 大于 1KB 才压缩
    level: 6, // 压缩级别 1-9
}));

// ETag 支持（Phase 6 性能优化）
app.set('etag', 'strong');

// 请求体解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 输入清理（Phase 6 安全加固）
app.use(sanitizeAll);

// 可疑请求检测（Phase 6 安全加固）
app.use(detectSuspiciousRequest);

// 请求日志
app.use(requestLogger);

// =============================================
// 路由
// =============================================

app.use('/api', healthRouter);

// CSRF Token 获取端点
app.get('/api/v1/csrf-token', getCsrfToken);

app.use('/api/v1/auth', authRateLimiter, authRouter);
app.use('/api/v1/categories', apiRateLimiter, authenticate, categoriesCache, categoriesRouter);
app.use('/api/v1/links', apiRateLimiter, authenticate, linksCache, linksRouter);
app.use('/api/v1/tasks', apiRateLimiter, authenticate, tasksCache, tasksRouter);
app.use('/api/v1/data', apiRateLimiter, dataRouter);

// API 文档（开发环境）
if (config.nodeEnv === 'development') {
    app.use('/api/docs', swaggerRouter);
}

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
    console.log(`当前阶段：Phase 6 - 优化与发布`);
    console.log(`环境：${config.nodeEnv}`);
});

export default app;
