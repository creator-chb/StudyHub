/**
 * 环境变量配置加载模块
 * 统一管理所有环境变量，提供类型安全的访问
 */

import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

interface Config {
    port: number;
    nodeEnv: string;
    frontendUrl: string;
    db: {
        user: string;
        password: string;
        host: string;
        port: number;
        database: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
}

const config: Config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080',
    db: {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'studyhub',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-me',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
};

export default config;
