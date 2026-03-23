/**
 * StudyHub Swagger API 文档配置
 * 提供交互式 API 文档界面
 */

import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// 加载 OpenAPI 规范
let swaggerDocument: object;
try {
    const openApiPath = join(__dirname, 'openapi.json');
    const openApiContent = readFileSync(openApiPath, 'utf-8');
    swaggerDocument = JSON.parse(openApiContent);
} catch (error) {
    // 如果文件不存在，使用内联定义
    swaggerDocument = {
        openapi: '3.0.0',
        info: {
            title: 'StudyHub API',
            version: '2.0.0',
            description: 'StudyHub 学习管理平台 API 文档',
            contact: {
                name: 'StudyHub Team',
            },
        },
        servers: [
            {
                url: '/api/v1',
                description: 'API v1',
            },
        ],
        paths: {
            '/health': {
                get: {
                    summary: '健康检查',
                    tags: ['System'],
                    responses: {
                        '200': {
                            description: '服务正常运行',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            status: { type: 'string', example: 'ok' },
                                            timestamp: { type: 'string', format: 'date-time' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/auth/register': {
                post: {
                    summary: '用户注册',
                    tags: ['Authentication'],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['username', 'password', 'email'],
                                    properties: {
                                        username: { type: 'string', minLength: 3, maxLength: 50 },
                                        password: { type: 'string', minLength: 6 },
                                        email: { type: 'string', format: 'email' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        '201': { description: '注册成功' },
                        '400': { description: '请求参数错误' },
                        '409': { description: '用户已存在' },
                    },
                },
            },
            '/auth/login': {
                post: {
                    summary: '用户登录',
                    tags: ['Authentication'],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['username', 'password'],
                                    properties: {
                                        username: { type: 'string' },
                                        password: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        '200': {
                            description: '登录成功',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            token: { type: 'string' },
                                            refreshToken: { type: 'string' },
                                            user: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'string' },
                                                    username: { type: 'string' },
                                                    email: { type: 'string' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        '401': { description: '认证失败' },
                    },
                },
            },
            '/links': {
                get: {
                    summary: '获取链接列表',
                    tags: ['Links'],
                    security: [{ bearerAuth: [] }],
                    responses: {
                        '200': {
                            description: '链接列表',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                name: { type: 'string' },
                                                url: { type: 'string' },
                                                categoryId: { type: 'string' },
                                                pinned: { type: 'boolean' },
                                                createdAt: { type: 'string', format: 'date-time' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    summary: '创建链接',
                    tags: ['Links'],
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'url'],
                                    properties: {
                                        name: { type: 'string', maxLength: 100 },
                                        url: { type: 'string', format: 'uri' },
                                        categoryId: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        '201': { description: '创建成功' },
                        '400': { description: '参数错误' },
                    },
                },
            },
            '/tasks': {
                get: {
                    summary: '获取任务列表',
                    tags: ['Tasks'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'status',
                            in: 'query',
                            schema: { type: 'string', enum: ['pending', 'completed', 'all'] },
                        },
                        {
                            name: 'priority',
                            in: 'query',
                            schema: { type: 'string', enum: ['high', 'medium', 'low'] },
                        },
                    ],
                    responses: {
                        '200': {
                            description: '任务列表',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                title: { type: 'string' },
                                                description: { type: 'string' },
                                                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                                                status: { type: 'string', enum: ['pending', 'completed'] },
                                                dueDate: { type: 'string', format: 'date-time' },
                                                createdAt: { type: 'string', format: 'date-time' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    summary: '创建任务',
                    tags: ['Tasks'],
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['title'],
                                    properties: {
                                        title: { type: 'string', maxLength: 200 },
                                        description: { type: 'string', maxLength: 2000 },
                                        priority: { type: 'string', enum: ['high', 'medium', 'low'], default: 'medium' },
                                        dueDate: { type: 'string', format: 'date-time' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        '201': { description: '创建成功' },
                        '400': { description: '参数错误' },
                    },
                },
            },
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    };
}

// Swagger UI 配置
const swaggerOptions = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'StudyHub API Documentation',
};

// 路由配置
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument, swaggerOptions));

// JSON 格式的 API 规范
router.get('/json', (req, res) => {
    res.json(swaggerDocument);
});

export default router;
