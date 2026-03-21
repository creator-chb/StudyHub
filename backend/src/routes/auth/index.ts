/**
 * 认证路由
 * 处理用户注册、登录、登出等操作
 */

import { Router, Request, Response } from 'express';
import * as UserModel from '../../models/User.js';
import * as RefreshTokenModel from '../../models/RefreshToken.js';
import { generateAccessToken, generateRefreshToken, verifyToken, TokenPayload } from '../../utils/jwt.js';
import { authenticate, AuthRequest } from '../../middleware/auth.js';

const router = Router();

/**
 * POST /api/v1/auth/register
 * 用户注册
 */
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, username, password } = req.body;

        // 验证必填字段
        if (!email || !username || !password) {
            res.status(400).json({
                success: false,
                message: '请提供邮箱、用户名和密码',
            });
            return;
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({
                success: false,
                message: '邮箱格式无效',
            });
            return;
        }

        // 验证密码长度
        if (password.length < 6) {
            res.status(400).json({
                success: false,
                message: '密码长度至少为 6 个字符',
            });
            return;
        }

        // 检查邮箱是否已存在
        if (await UserModel.emailExists(email)) {
            res.status(409).json({
                success: false,
                message: '该邮箱已被注册',
            });
            return;
        }

        // 检查用户名是否已存在
        if (await UserModel.usernameExists(username)) {
            res.status(409).json({
                success: false,
                message: '该用户名已被使用',
            });
            return;
        }

        // 创建用户
        const user = await UserModel.create({ email, username, password });

        // 生成令牌
        const payload: TokenPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
        };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        // 保存刷新令牌
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await RefreshTokenModel.save(user.id, refreshToken, expiresAt);

        res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    createdAt: user.created_at,
                },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        console.error('[Auth] 注册错误:', error);
        res.status(500).json({
            success: false,
            message: '注册失败，请稍后重试',
        });
    }
});

/**
 * POST /api/v1/auth/login
 * 用户登录
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // 验证必填字段
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: '请提供邮箱和密码',
            });
            return;
        }

        // 查找用户
        const user = await UserModel.findByEmail(email);
        if (!user) {
            res.status(401).json({
                success: false,
                message: '邮箱或密码错误',
            });
            return;
        }

        // 验证密码
        const isValid = await UserModel.verifyPassword(user, password);
        if (!isValid) {
            res.status(401).json({
                success: false,
                message: '邮箱或密码错误',
            });
            return;
        }

        // 生成令牌
        const payload: TokenPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
        };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        // 保存刷新令牌
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await RefreshTokenModel.save(user.id, refreshToken, expiresAt);

        res.json({
            success: true,
            message: '登录成功',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    createdAt: user.created_at,
                },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        console.error('[Auth] 登录错误:', error);
        res.status(500).json({
            success: false,
            message: '登录失败，请稍后重试',
        });
    }
});

/**
 * POST /api/v1/auth/refresh
 * 刷新访问令牌
 */
router.post('/refresh', async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(400).json({
                success: false,
                message: '请提供刷新令牌',
            });
            return;
        }

        // 验证刷新令牌
        let payload: TokenPayload;
        try {
            payload = verifyToken(refreshToken);
        } catch {
            res.status(401).json({
                success: false,
                message: '刷新令牌无效或已过期',
            });
            return;
        }

        // 检查刷新令牌是否在数据库中
        const storedToken = await RefreshTokenModel.find(refreshToken);
        if (!storedToken) {
            res.status(401).json({
                success: false,
                message: '刷新令牌已被撤销',
            });
            return;
        }

        // 获取用户信息
        const user = await UserModel.findById(payload.userId);
        if (!user) {
            res.status(401).json({
                success: false,
                message: '用户不存在',
            });
            return;
        }

        // 生成新令牌
        const newPayload: TokenPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
        };
        const accessToken = generateAccessToken(newPayload);
        const newRefreshToken = generateRefreshToken(newPayload);

        // 替换刷新令牌
        await RefreshTokenModel.deleteToken(refreshToken);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await RefreshTokenModel.save(user.id, newRefreshToken, expiresAt);

        res.json({
            success: true,
            message: '令牌刷新成功',
            data: {
                accessToken,
                refreshToken: newRefreshToken,
            },
        });
    } catch (error) {
        console.error('[Auth] 刷新令牌错误:', error);
        res.status(500).json({
            success: false,
            message: '令牌刷新失败，请稍后重试',
        });
    }
});

/**
 * GET /api/v1/auth/me
 * 获取当前用户信息
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const user = await UserModel.findById(userId);

        if (!user) {
            res.status(404).json({
                success: false,
                message: '用户不存在',
            });
            return;
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    createdAt: user.created_at,
                },
            },
        });
    } catch (error) {
        console.error('[Auth] 获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '获取用户信息失败',
        });
    }
});

/**
 * POST /api/v1/auth/logout
 * 用户登出
 */
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        // 删除用户的刷新令牌
        await RefreshTokenModel.remove(userId);

        res.json({
            success: true,
            message: '登出成功',
        });
    } catch (error) {
        console.error('[Auth] 登出错误:', error);
        res.status(500).json({
            success: false,
            message: '登出失败，请稍后重试',
        });
    }
});

export default router;
