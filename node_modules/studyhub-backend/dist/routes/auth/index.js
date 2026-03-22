"use strict";
/**
 * 认证路由
 * 处理用户注册、登录、登出等操作
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserModel = __importStar(require("../../models/User.js"));
const RefreshTokenModel = __importStar(require("../../models/RefreshToken.js"));
const jwt_js_1 = require("../../utils/jwt.js");
const auth_js_1 = require("../../middleware/auth.js");
const router = (0, express_1.Router)();
/**
 * POST /api/v1/auth/register
 * 用户注册
 */
router.post('/register', async (req, res) => {
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
        const payload = {
            userId: user.id,
            email: user.email,
            username: user.username,
        };
        const accessToken = (0, jwt_js_1.generateAccessToken)(payload);
        const refreshToken = (0, jwt_js_1.generateRefreshToken)(payload);
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
    }
    catch (error) {
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
router.post('/login', async (req, res) => {
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
        const payload = {
            userId: user.id,
            email: user.email,
            username: user.username,
        };
        const accessToken = (0, jwt_js_1.generateAccessToken)(payload);
        const refreshToken = (0, jwt_js_1.generateRefreshToken)(payload);
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
    }
    catch (error) {
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
router.post('/refresh', async (req, res) => {
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
        let payload;
        try {
            payload = (0, jwt_js_1.verifyToken)(refreshToken);
        }
        catch {
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
        const newPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
        };
        const accessToken = (0, jwt_js_1.generateAccessToken)(newPayload);
        const newRefreshToken = (0, jwt_js_1.generateRefreshToken)(newPayload);
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
    }
    catch (error) {
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
router.get('/me', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
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
    }
    catch (error) {
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
router.post('/logout', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        // 删除用户的刷新令牌
        await RefreshTokenModel.remove(userId);
        res.json({
            success: true,
            message: '登出成功',
        });
    }
    catch (error) {
        console.error('[Auth] 登出错误:', error);
        res.status(500).json({
            success: false,
            message: '登出失败，请稍后重试',
        });
    }
});
exports.default = router;
//# sourceMappingURL=index.js.map