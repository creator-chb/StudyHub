/**
 * StudyHub 工具函数模块
 * 提供通用的工具函数
 * @module Utils
 */

const Utils = (function() {
    'use strict';

    /**
     * HTML 转义映射表
     * @type {Object}
     */
    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    /**
     * 工具函数集合
     */
    return {
        /**
         * 转义 HTML 特殊字符，防止 XSS 攻击
         * @param {string} str - 要转义的字符串
         * @param {Object} options - 选项
         * @returns {string} 转义后的字符串
         */
        escapeHtml(str, options = {}) {
            if (str == null) return '';
            
            let result = String(str);
            
            // 基本转义
            result = result.replace(/[&<>"'`=/]/g, char => htmlEscapes[char]);
            
            // 额外的安全清理
            if (options.strict) {
                // 移除所有脚本相关内容
                result = result
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '')
                    .replace(/data:/gi, '');
            }
            
            return result;
        },

        /**
         * 转义 HTML 属性值
         * @param {string} str - 要转义的字符串
         * @returns {string} 转义后的字符串
         */
        escapeAttribute(str) {
            if (str == null) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        },

        /**
         * 清理 URL，移除危险协议
         * @param {string} url - URL 字符串
         * @returns {string} 清理后的 URL
         */
        sanitizeUrl(url) {
            if (!url) return '';
            
            const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:'];
            const lowerUrl = url.toLowerCase().trim();
            
            // 检查危险协议
            for (const protocol of dangerousProtocols) {
                if (lowerUrl.startsWith(protocol)) {
                    return '#'; // 返回安全的占位符
                }
            }
            
            return url.trim();
        },

        /**
         * 清理 HTML 内容（移除潜在危险的标签和属性）
         * @param {string} html - HTML 字符串
         * @returns {string} 清理后的 HTML
         */
        sanitizeHtml(html) {
            if (!html) return '';
            
            return String(html)
                // 移除 script 标签
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                // 移除 style 标签
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                // 移除事件处理器
                .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
                // 移除 javascript: 协议
                .replace(/javascript:/gi, '')
                // 移除 data: 协议
                .replace(/data:/gi, '')
                // 移除 iframe 标签
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                // 移除 object 和 embed 标签
                .replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
        },

        /**
         * 缩短 URL 显示
         * @param {string} url - 完整 URL
         * @param {number} maxLength - 最大长度
         * @returns {string} 缩短后的 URL
         */
        shortenUrl(url, maxLength = 30) {
            try {
                const urlObj = new URL(url);
                return urlObj.hostname;
            } catch {
                return url.length > maxLength ? url.slice(0, maxLength) + '...' : url;
            }
        },

        /**
         * 格式化日期时间
         * @param {string|Date} date - 日期对象或字符串
         * @param {Object} options - 格式化选项
         * @returns {string} 格式化后的日期字符串
         */
        formatDateTime(date, options = {}) {
            const d = date instanceof Date ? date : new Date(date);
            if (isNaN(d.getTime())) return '无效日期';
            
            const defaultOptions = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            };
            
            return d.toLocaleString('zh-CN', { ...defaultOptions, ...options });
        },

        /**
         * 生成唯一 ID
         * @returns {string} 唯一标识符
         */
        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        },

        /**
         * 防抖函数
         * @param {Function} func - 要防抖的函数
         * @param {number} wait - 等待时间（毫秒）
         * @returns {Function} 防抖后的函数
         */
        debounce(func, wait = 300) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * 节流函数
         * @param {Function} func - 要节流的函数
         * @param {number} limit - 限制时间（毫秒）
         * @returns {Function} 节流后的函数
         */
        throttle(func, limit = 100) {
            let inThrottle;
            return function executedFunction(...args) {
                if (!inThrottle) {
                    func(...args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * 深度克隆对象
         * @param {*} obj - 要克隆的对象
         * @returns {*} 克隆后的对象
         */
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
            
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        },

        /**
         * 验证 URL 格式
         * @param {string} url - 要验证的 URL
         * @returns {Object} 验证结果 { valid: boolean, error?: string }
         */
        validateUrl(url) {
            if (!url || !url.trim()) {
                return { valid: false, error: '请输入链接地址' };
            }
            
            url = url.trim();
            
            if (!url.match(/^https?:\/\//i)) {
                return { valid: false, error: '链接必须以 http:// 或 https:// 开头' };
            }
            
            try {
                const urlObj = new URL(url);
                
                // 检查可疑协议
                if (['data:', 'javascript:', 'vbscript:', 'file:'].includes(urlObj.protocol)) {
                    return { valid: false, error: '不安全的协议类型' };
                }
                
                if (!urlObj.hostname || urlObj.hostname.length < 2) {
                    return { valid: false, error: '域名格式不正确' };
                }
                
                if (!urlObj.hostname.includes('.')) {
                    return { valid: false, error: '域名不完整，缺少顶级域名（如 .com）' };
                }
                
                return { valid: true };
            } catch (e) {
                return { valid: false, error: '链接格式不正确' };
            }
        },

        /**
         * 计算剩余时间
         * @param {string|Date} deadline - 截止时间
         * @returns {Object} 剩余时间信息
         */
        getRemainingTime(deadline) {
            const now = new Date();
            const end = new Date(deadline);
            const diff = end - now;
            
            if (diff < 0) {
                const overdueDiff = Math.abs(diff);
                const days = Math.floor(overdueDiff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((overdueDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                
                if (days > 0) {
                    return { 
                        text: `已逾期 ${days} 天${hours > 0 ? ' ' + hours + ' 小时' : ''}`, 
                        type: 'overdue', 
                        overdue: true, 
                        days 
                    };
                } else if (hours > 0) {
                    return { text: `已逾期 ${hours} 小时`, type: 'overdue', overdue: true, days: 0 };
                } else {
                    return { text: '已逾期', type: 'overdue', overdue: true, days: 0 };
                }
            }
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            if (days > 0) {
                return { 
                    text: `剩余 ${days} 天 ${hours} 小时`, 
                    type: days <= 1 ? 'urgent' : 'normal', 
                    overdue: false 
                };
            } else if (hours > 0) {
                return { text: `剩余 ${hours} 小时 ${minutes} 分钟`, type: 'urgent', overdue: false };
            } else if (minutes > 0) {
                return { text: `剩余 ${minutes} 分钟`, type: 'urgent', overdue: false };
            } else {
                return { text: '即将到期', type: 'urgent', overdue: false };
            }
        },

        /**
         * 下载文件
         * @param {string} content - 文件内容
         * @param {string} filename - 文件名
         * @param {string} type - MIME 类型
         */
        downloadFile(content, filename, type = 'application/json') {
            const blob = new Blob([content], { type });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        },

        /**
         * 读取文件内容
         * @param {File} file - 文件对象
         * @returns {Promise<string>} 文件内容
         */
        readFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsText(file);
            });
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
