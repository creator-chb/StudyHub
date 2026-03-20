/**
 * StudyHub 后端服务入口
 * Phase 0 骨架：仅提供健康检查端点
 * Phase 1 将实现：用户认证、链接/任务的 CRUD API
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const healthRouter = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

// =============================================
// 中间件
// =============================================
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============================================
// 路由
// =============================================
app.use('/api', healthRouter);

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `路由 ${req.method} ${req.path} 不存在`
    });
});

// 全局错误处理
app.use((err, req, res, next) => {
    console.error('[StudyHub Backend Error]', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || '服务器内部错误'
    });
});

// =============================================
// 启动服务
// =============================================
app.listen(PORT, () => {
    console.log(`StudyHub 后端服务运行在 http://localhost:${PORT}`);
    console.log(`允许跨域来源: ${FRONTEND_URL}`);
    console.log('当前阶段: Phase 0（骨架）');
});

module.exports = app;
