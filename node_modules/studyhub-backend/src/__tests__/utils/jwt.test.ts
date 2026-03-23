/**
 * JWT 工具函数单元测试
 */

import { describe, it, expect } from '@jest/globals';
import { generateAccessToken, verifyToken, generateRefreshToken } from '../../utils/jwt.js';

describe('JWT Utils', () => {
  const testPayload = { userId: 'test-user-123', email: 'test@example.com', username: 'testuser' };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateAccessToken(testPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should generate different tokens for different payloads', () => {
      const token1 = generateAccessToken({ userId: 'user1', email: 'user1@example.com', username: 'user1' });
      const token2 = generateAccessToken({ userId: 'user2', email: 'user2@example.com', username: 'user2' });
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.username).toBe(testPayload.username);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const refreshToken = generateRefreshToken(testPayload);
      
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
    });

    it('should be verifiable', () => {
      const refreshToken = generateRefreshToken(testPayload);
      const decoded = verifyToken(refreshToken);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testPayload.userId);
    });
  });
});
