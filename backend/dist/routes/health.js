"use strict";
/**
 * 健康检查路由
 * GET /api/health - 检查服务是否正常运行
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
/**
 * GET /api/health
 * 返回服务健康状态
 */
router.get('/health', (_req, res) => {
    res.json({
        success: true,
        status: 'ok',
        service: 'studyhub-backend',
        version: '2.0.0-dev',
        phase: 'Phase 1 - 后端基础与用户认证',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
exports.default = router;
//# sourceMappingURL=health.js.map