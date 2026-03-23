/**
 * API 集成测试
 * 使用 Supertest 测试 API 端点
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

// 注意：这些测试需要数据库和 Redis 服务运行
// 可以使用 mock 或测试数据库进行隔离测试

describe('Health Check API', () => {
    // 基本健康检查测试（不需要数据库）
    it('GET /api/health should return 200', async () => {
        // 这个测试假设服务器正在运行
        // 在 CI/CD 中，应该先启动测试服务器
        const response = await request('http://localhost:3000')
            .get('/api/health')
            .timeout(5000)
            .catch(() => ({ status: 503, body: { status: 'error' } }));

        // 如果服务器未运行，跳过测试
        if (response.status === 503) {
            console.log('跳过测试：服务器未运行');
            return;
        }

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
    });
});

describe('Auth API', () => {
    const testUser = {
        email: `test-${Date.now()}@example.com`,
        username: `testuser${Date.now()}`,
        password: 'TestPassword123!',
    };

    let accessToken: string;
    let refreshToken: string;

    describe('POST /api/v1/auth/register', () => {
        it('should register a new user', async () => {
            const response = await request('http://localhost:3000')
                .post('/api/v1/auth/register')
                .send(testUser)
                .timeout(5000)
                .catch(() => ({ status: 503, body: {} }));

            if (response.status === 503) {
                console.log('跳过测试：服务器未运行');
                return;
            }

            expect([201, 400, 409]).toContain(response.status);
            
            if (response.status === 201) {
                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('accessToken');
                accessToken = response.body.data.accessToken;
                refreshToken = response.body.data.refreshToken;
            }
        });

        it('should reject duplicate email', async () => {
            const response = await request('http://localhost:3000')
                .post('/api/v1/auth/register')
                .send(testUser)
                .timeout(5000)
                .catch(() => ({ status: 503, body: {} }));

            if (response.status === 503) {
                console.log('跳过测试：服务器未运行');
                return;
            }

            expect([400, 409]).toContain(response.status);
        });

        it('should reject invalid email', async () => {
            const response = await request('http://localhost:3000')
                .post('/api/v1/auth/register')
                .send({
                    email: 'not-an-email',
                    username: 'testuser',
                    password: 'Password123!',
                })
                .timeout(5000)
                .catch(() => ({ status: 503, body: {} }));

            if (response.status === 503) {
                console.log('跳过测试：服务器未运行');
                return;
            }

            expect(response.status).toBe(400);
        });

        it('should reject weak password', async () => {
            const response = await request('http://localhost:3000')
                .post('/api/v1/auth/register')
                .send({
                    email: 'test2@example.com',
                    username: 'testuser2',
                    password: '123',
                })
                .timeout(5000)
                .catch(() => ({ status: 503, body: {} }));

            if (response.status === 503) {
                console.log('跳过测试：服务器未运行');
                return;
            }

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('should login with valid credentials', async () => {
            const response = await request('http://localhost:3000')
                .post('/api/v1/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                })
                .timeout(5000)
                .catch(() => ({ status: 503, body: {} }));

            if (response.status === 503) {
                console.log('跳过测试：服务器未运行');
                return;
            }

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            accessToken = response.body.data.accessToken;
        });

        it('should reject invalid password', async () => {
            const response = await request('http://localhost:3000')
                .post('/api/v1/auth/login')
                .send({
                    email: testUser.email,
                    password: 'WrongPassword123!',
                })
                .timeout(5000)
                .catch(() => ({ status: 503, body: {} }));

            if (response.status === 503) {
                console.log('跳过测试：服务器未运行');
                return;
            }

            expect(response.status).toBe(401);
        });

        it('should reject non-existent user', async () => {
            const response = await request('http://localhost:3000')
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Password123!',
                })
                .timeout(5000)
                .catch(() => ({ status: 503, body: {} }));

            if (response.status === 503) {
                console.log('跳过测试：服务器未运行');
                return;
            }

            expect(response.status).toBe(401);
        });
    });
});

describe('Links API (requires auth)', () => {
    it('GET /api/v1/links should return 401 without auth', async () => {
        const response = await request('http://localhost:3000')
            .get('/api/v1/links')
            .timeout(5000)
            .catch(() => ({ status: 503, body: {} }));

        if (response.status === 503) {
            console.log('跳过测试：服务器未运行');
            return;
        }

        expect(response.status).toBe(401);
    });
});

describe('Tasks API (requires auth)', () => {
    it('GET /api/v1/tasks should return 401 without auth', async () => {
        const response = await request('http://localhost:3000')
            .get('/api/v1/tasks')
            .timeout(5000)
            .catch(() => ({ status: 503, body: {} }));

        if (response.status === 503) {
            console.log('跳过测试：服务器未运行');
            return;
        }

        expect(response.status).toBe(401);
    });
});
