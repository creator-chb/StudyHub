/**
 * 验证工具函数单元测试
 */

import { describe, it, expect } from '@jest/globals';
import {
    createLinkSchema,
    updateLinkSchema,
    createTaskSchema,
    updateTaskSchema,
    linkFilterSchema,
    taskFilterSchema,
} from '../../utils/validation.js';

describe('Validation Schemas', () => {
    describe('createLinkSchema', () => {
        it('should validate a valid link', () => {
            const result = createLinkSchema.safeParse({
                title: 'Test Link',
                url: 'https://example.com',
                category_id: '123e4567-e89b-12d3-a456-426614174000',
            });
            
            expect(result.success).toBe(true);
        });

        it('should reject empty title', () => {
            const result = createLinkSchema.safeParse({
                title: '',
                url: 'https://example.com',
            });
            
            expect(result.success).toBe(false);
        });

        it('should reject invalid URL', () => {
            const result = createLinkSchema.safeParse({
                title: 'Test Link',
                url: 'not-a-url',
            });
            
            expect(result.success).toBe(false);
        });

        it('should reject title longer than 255 chars', () => {
            const result = createLinkSchema.safeParse({
                title: 'a'.repeat(256),
                url: 'https://example.com',
            });
            
            expect(result.success).toBe(false);
        });
    });

    describe('updateLinkSchema', () => {
        it('should validate partial update', () => {
            const result = updateLinkSchema.safeParse({
                title: 'Updated Title',
            });
            
            expect(result.success).toBe(true);
        });

        it('should allow empty update', () => {
            const result = updateLinkSchema.safeParse({});
            
            expect(result.success).toBe(true);
        });
    });

    describe('linkFilterSchema', () => {
        it('should apply default values', () => {
            const result = linkFilterSchema.safeParse({});
            
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.page).toBe(1);
                expect(result.data.limit).toBe(20);
            }
        });

        it('should reject invalid page', () => {
            const result = linkFilterSchema.safeParse({
                page: -1,
            });
            
            expect(result.success).toBe(false);
        });

        it('should reject limit over 100', () => {
            const result = linkFilterSchema.safeParse({
                limit: 200,
            });
            
            expect(result.success).toBe(false);
        });
    });

    describe('createTaskSchema', () => {
        it('should validate a valid task', () => {
            const result = createTaskSchema.safeParse({
                name: 'Test Task',
                deadline: new Date().toISOString(),
                priority: 'high',
            });
            
            expect(result.success).toBe(true);
        });

        it('should reject empty name', () => {
            const result = createTaskSchema.safeParse({
                name: '',
                deadline: new Date().toISOString(),
            });
            
            expect(result.success).toBe(false);
        });

        it('should reject invalid priority', () => {
            const result = createTaskSchema.safeParse({
                name: 'Test Task',
                deadline: new Date().toISOString(),
                priority: 'urgent',
            });
            
            expect(result.success).toBe(false);
        });

        it('should reject invalid deadline', () => {
            const result = createTaskSchema.safeParse({
                name: 'Test Task',
                deadline: 'not-a-date',
            });
            
            expect(result.success).toBe(false);
        });
    });

    describe('updateTaskSchema', () => {
        it('should validate partial update', () => {
            const result = updateTaskSchema.safeParse({
                name: 'Updated Task',
            });
            
            expect(result.success).toBe(true);
        });
    });

    describe('taskFilterSchema', () => {
        it('should apply default values', () => {
            const result = taskFilterSchema.safeParse({});
            
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.status).toBe('all');
                expect(result.data.page).toBe(1);
            }
        });
    });
});
