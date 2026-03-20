/**
 * 健康检查路由
 * GET /api/health - 检查服务是否正常运行
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/health
 * 返回服务健康状态
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        service: 'studyhub-backend',
        version: '2.0.0-dev',
        phase: 'Phase 0 - 骨架',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;
