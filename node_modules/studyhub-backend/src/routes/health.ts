/**
 * 健康检查路由
 * GET /api/health - 检查服务是否正常运行
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/health
 * 返回服务健康状态
 */
router.get('/health', (_req: Request, res: Response) => {
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

export default router;
