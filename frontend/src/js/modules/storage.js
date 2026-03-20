/**
 * StudyHub 存储工厂模块
 * 根据 features.backendSync 配置选择适当的存储适配器
 * 当前阶段（Phase 0）：始终使用 LocalStorageAdapter
 * Phase 1 实现后可通过 Config.set('features.backendSync', true) 切换到后端适配器
 * @module Storage
 */

const Storage = (function() {
    'use strict';

    // 根据配置选择存储适配器
    if (Config.get('features.backendSync') === true) {
        // BackendAdapter 将在 Phase 1 实现
        // return BackendAdapter;
        console.warn('StudyHub: 后端同步模式（Phase 1）尚未实现，已自动回退到本地存储。');
        return LocalStorageAdapter;
    }

    return LocalStorageAdapter;
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
