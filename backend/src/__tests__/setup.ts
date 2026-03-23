/**
 * Jest 测试环境设置
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/studyhub_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.PORT = '3001';
