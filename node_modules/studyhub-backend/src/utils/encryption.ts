/**
 * 加密工具模块
 * 提供敏感数据加密和日志脱敏功能
 */

import crypto from 'crypto';
import config from '../config/index.js';

// 加密算法
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * 获取加密密钥
 * 从 JWT secret 派生 32 字节密钥
 */
function getEncryptionKey(): Buffer {
    return crypto
        .createHash('sha256')
        .update(config.jwt.secret)
        .digest();
}

/**
 * 加密敏感数据
 * @param plaintext - 明文
 * @returns {string} 加密后的数据（base64 编码）
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // 格式: iv:authTag:encrypted
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * 解密敏感数据
 * @param encryptedData - 加密的数据
 * @returns {string} 解密后的明文
 */
export function decrypt(encryptedData: string): string {
    const key = getEncryptionKey();
    const [ivBase64, authTagBase64, encrypted] = encryptedData.split(':');

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * 敏感字段列表
 */
const SENSITIVE_FIELDS = [
    'password',
    'password_hash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
];

/**
 * 脱敏字符串
 * @param str - 要脱敏的字符串
 * @param visibleChars - 可见字符数
 * @returns {string} 脱敏后的字符串
 */
export function maskString(str: string, visibleChars: number = 4): string {
    if (!str || str.length <= visibleChars) {
        return '***';
    }
    return str.substring(0, visibleChars) + '*'.repeat(Math.min(str.length - visibleChars, 10));
}

/**
 * 脱敏邮箱
 * @param email - 邮箱地址
 * @returns {string} 脱敏后的邮箱
 */
export function maskEmail(email: string): string {
    if (!email || !email.includes('@')) {
        return '***@***.***';
    }
    const [localPart, domain] = email.split('@');
    const maskedLocal = localPart.length > 2 
        ? localPart[0] + '***' + localPart[localPart.length - 1]
        : '***';
    return `${maskedLocal}@${domain}`;
}

/**
 * 脱敏对象中的敏感字段
 * @param obj - 要处理的对象
 * @returns {Object} 脱敏后的对象
 */
export function maskSensitiveData(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => maskSensitiveData(item));
    }

    if (typeof obj === 'object') {
        const masked: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            const lowerKey = key.toLowerCase();
            
            // 检查是否为敏感字段
            const isSensitive = SENSITIVE_FIELDS.some(field => 
                lowerKey.includes(field.toLowerCase())
            );

            if (isSensitive) {
                if (typeof value === 'string') {
                    // 特殊处理邮箱
                    if (lowerKey.includes('email')) {
                        masked[key] = maskEmail(value);
                    } else {
                        masked[key] = maskString(value);
                    }
                } else {
                    masked[key] = '***';
                }
            } else if (typeof value === 'object' && value !== null) {
                masked[key] = maskSensitiveData(value);
            } else {
                masked[key] = value;
            }
        }
        return masked;
    }

    return obj;
}

/**
 * 安全日志输出
 * @param level - 日志级别
 * @param message - 日志消息
 * @param data - 日志数据
 */
export function secureLog(level: 'log' | 'warn' | 'error' | 'info', message: string, data?: unknown): void {
    const maskedData = data ? maskSensitiveData(data) : undefined;
    const timestamp = new Date().toISOString();
    
    const logEntry = {
        timestamp,
        level,
        message,
        data: maskedData,
    };

    switch (level) {
        case 'error':
            console.error(JSON.stringify(logEntry));
            break;
        case 'warn':
            console.warn(JSON.stringify(logEntry));
            break;
        case 'info':
            console.info(JSON.stringify(logEntry));
            break;
        default:
            console.log(JSON.stringify(logEntry));
    }
}

export default {
    encrypt,
    decrypt,
    maskString,
    maskEmail,
    maskSensitiveData,
    secureLog,
};
