/**
 * StudyHub 同步设置模块
 * 提供本地/API 模式切换 UI 和状态显示
 * @module SyncSettings
 */

const SyncSettings = (function() {
    'use strict';

    /**
     * 模态框 ID
     * @type {string}
     */
    const MODAL_ID = 'sync-settings-modal';

    /**
     * 当前状态
     * @type {Object}
     */
    let state = {
        isOpen: false,
        isSwitching: false,
        currentMode: 'local'
    };

    // =============================================
    // UI 渲染
    // =============================================

    /**
     * 生成同步设置模态框 HTML
     * @returns {string}
     */
    function generateModalHTML() {
        const isApiMode = Storage.getMode() === 'api';
        const syncState = Storage.getSyncState();
        const usage = Storage.getUsage();

        return `
            <div class="sync-settings">
                <div class="sync-header">
                    <h3>数据同步设置</h3>
                    <p class="sync-description">选择数据存储方式，本地模式数据保存在浏览器，云端模式数据同步到服务器。</p>
                </div>

                <div class="sync-options">
                    <div class="sync-option ${!isApiMode ? 'active' : ''}" data-mode="local">
                        <div class="sync-option-icon">
                            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                <path d="M2 17l10 5 10-5"/>
                                <path d="M2 12l10 5 10-5"/>
                            </svg>
                        </div>
                        <div class="sync-option-content">
                            <h4>本地存储</h4>
                            <p>数据保存在浏览器本地，无需登录，切换浏览器或设备数据不共享。</p>
                            <ul class="sync-option-features">
                                <li>无需登录</li>
                                <li>完全离线可用</li>
                                <li>数据仅本机可见</li>
                            </ul>
                        </div>
                        <div class="sync-option-check">
                            ${!isApiMode ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>' : ''}
                        </div>
                    </div>

                    <div class="sync-option ${isApiMode ? 'active' : ''}" data-mode="api">
                        <div class="sync-option-icon">
                            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                            </svg>
                        </div>
                        <div class="sync-option-content">
                            <h4>云端同步</h4>
                            <p>数据同步到云端服务器，支持多设备同步，需要登录账户。</p>
                            <ul class="sync-option-features">
                                <li>多设备同步</li>
                                <li>数据备份</li>
                                <li>需要登录账户</li>
                            </ul>
                        </div>
                        <div class="sync-option-check">
                            ${isApiMode ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>' : ''}
                        </div>
                    </div>
                </div>

                <div class="sync-status">
                    <div class="sync-status-item">
                        <span class="sync-status-label">当前模式</span>
                        <span class="sync-status-value">${isApiMode ? '云端同步' : '本地存储'}</span>
                    </div>
                    <div class="sync-status-item">
                        <span class="sync-status-label">数据大小</span>
                        <span class="sync-status-value">${usage.totalSizeFormatted}</span>
                    </div>
                    ${isApiMode ? `
                    <div class="sync-status-item">
                        <span class="sync-status-label">同步状态</span>
                        <span class="sync-status-value ${syncState.isSyncing ? 'syncing' : ''}">${syncState.isSyncing ? '同步中...' : (syncState.lastError ? '同步失败' : '已同步')}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="sync-actions">
                    ${isApiMode ? `
                    <button type="button" class="btn btn-secondary sync-action-btn" data-action="sync-now">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6M1 20v-6h6"/>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                        </svg>
                        立即同步
                    </button>
                    ` : ''}
                    <button type="button" class="btn btn-primary sync-action-btn" data-action="confirm">
                        确认
                    </button>
                </div>

                <div class="sync-warning" style="display: none;">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    <span class="sync-warning-text"></span>
                </div>
            </div>
        `;
    }

    /**
     * 生成同步状态指示器 HTML
     * @returns {string}
     */
    function generateStatusIndicatorHTML() {
        const isApiMode = Storage.getMode() === 'api';
        const syncState = Storage.getSyncState();

        return `
            <div class="sync-indicator ${isApiMode ? 'api-mode' : ''}" title="${isApiMode ? '云端同步模式' : '本地存储模式'}">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    ${isApiMode ? `
                        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                    ` : `
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                    `}
                </svg>
                ${syncState.isSyncing ? '<span class="sync-spinner"></span>' : ''}
            </div>
        `;
    }

    // =============================================
    // 事件处理
    // =============================================

    /**
     * 处理模式选择
     * @param {string} mode
     */
    async function handleModeSelect(mode) {
        const currentMode = Storage.getMode();

        if (mode === currentMode) {
            return;
        }

        // 显示警告
        const warningEl = document.querySelector('.sync-warning');
        const warningText = warningEl?.querySelector('.sync-warning-text');

        if (mode === 'api' && !ApiClient.isAuthenticated()) {
            showWarning('切换到云端同步需要先登录账户');
            return;
        }

        if (mode === 'local') {
            showWarning('切换到本地模式后，云端数据将不会自动同步到本地');
        }

        // 更新 UI 选中状态
        document.querySelectorAll('.sync-option').forEach(el => {
            el.classList.remove('active');
            el.querySelector('.sync-option-check').innerHTML = '';
        });

        const selectedOption = document.querySelector(`.sync-option[data-mode="${mode}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
            selectedOption.querySelector('.sync-option-check').innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
            `;
        }

        state.currentMode = mode;
    }

    /**
     * 显示警告信息
     * @param {string} message
     */
    function showWarning(message) {
        const warningEl = document.querySelector('.sync-warning');
        const warningText = warningEl?.querySelector('.sync-warning-text');

        if (warningEl && warningText) {
            warningText.textContent = message;
            warningEl.style.display = 'flex';
        }
    }

    /**
     * 隐藏警告信息
     */
    function hideWarning() {
        const warningEl = document.querySelector('.sync-warning');
        if (warningEl) {
            warningEl.style.display = 'none';
        }
    }

    /**
     * 确认模式切换
     */
    async function confirmSwitch() {
        const targetMode = state.currentMode;
        const currentMode = Storage.getMode();

        if (targetMode === currentMode) {
            Modal.close();
            return;
        }

        state.isSwitching = true;
        updateUIForSwitching();

        try {
            const result = await Storage.switchMode(targetMode);

            if (result.success) {
                Toast.show(result.message, 'success');
                Modal.close();

                // 通知应用刷新数据
                if (window.App && window.App.refreshData) {
                    window.App.refreshData();
                }
            } else {
                showWarning(result.message);

                if (result.requireAuth) {
                    // 需要登录，跳转到登录
                    Modal.close();
                    if (window.AuthUI && window.AuthUI.showLoginModal) {
                        window.AuthUI.showLoginModal();
                    }
                }
            }
        } catch (e) {
            showWarning('切换失败: ' + e.message);
        } finally {
            state.isSwitching = false;
            updateUIAfterSwitching();
        }
    }

    /**
     * 立即同步
     */
    async function syncNow() {
        if (Storage.getMode() !== 'api') {
            return;
        }

        const syncBtn = document.querySelector('[data-action="sync-now"]');
        if (syncBtn) {
            syncBtn.disabled = true;
            syncBtn.innerHTML = `
                <span class="sync-spinner"></span>
                同步中...
            `;
        }

        try {
            const result = await Storage.sync();
            if (result) {
                Toast.show('同步成功', 'success');

                // 通知应用刷新数据
                if (window.App && window.App.refreshData) {
                    window.App.refreshData();
                }
            } else {
                Toast.show('同步失败', 'error');
            }
        } catch (e) {
            Toast.show('同步失败: ' + e.message, 'error');
        } finally {
            if (syncBtn) {
                syncBtn.disabled = false;
                syncBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 4v6h-6M1 20v-6h6"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    立即同步
                `;
            }
        }
    }

    /**
     * 更新切换中的 UI
     */
    function updateUIForSwitching() {
        const confirmBtn = document.querySelector('[data-action="confirm"]');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="sync-spinner"></span> 切换中...';
        }

        document.querySelectorAll('.sync-option').forEach(el => {
            el.style.pointerEvents = 'none';
        });
    }

    /**
     * 切换完成后恢复 UI
     */
    function updateUIAfterSwitching() {
        const confirmBtn = document.querySelector('[data-action="confirm"]');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = '确认';
        }

        document.querySelectorAll('.sync-option').forEach(el => {
            el.style.pointerEvents = '';
        });
    }

    /**
     * 绑定事件
     */
    function bindEvents() {
        // 模式选择
        document.querySelectorAll('.sync-option').forEach(el => {
            el.addEventListener('click', () => {
                const mode = el.dataset.mode;
                handleModeSelect(mode);
            });
        });

        // 按钮操作
        document.querySelectorAll('.sync-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;

                switch (action) {
                    case 'confirm':
                        confirmSwitch();
                        break;
                    case 'sync-now':
                        syncNow();
                        break;
                }
            });
        });
    }

    // =============================================
    // 公共 API
    // =============================================

    return {
        /**
         * 打开同步设置模态框
         */
        openModal() {
            state.isOpen = true;
            state.currentMode = Storage.getMode();

            Modal.open({
                id: MODAL_ID,
                title: '',
                content: generateModalHTML(),
                size: 'medium',
                showCloseButton: true,
                onClose: () => {
                    state.isOpen = false;
                }
            });

            // 延迟绑定事件，确保 DOM 已渲染
            setTimeout(bindEvents, 0);
        },

        /**
         * 关闭同步设置模态框
         */
        closeModal() {
            Modal.close();
            state.isOpen = false;
        },

        /**
         * 获取状态指示器 HTML
         * @returns {string}
         */
        getStatusIndicatorHTML: generateStatusIndicatorHTML,

        /**
         * 获取当前状态
         * @returns {Object}
         */
        getState() {
            return { ...state };
        },

        /**
         * 订阅模式变更
         * @param {Function} callback
         */
        onModeChange(callback) {
            Storage.onModeChange(callback);
        },

        /**
         * 取消订阅模式变更
         * @param {Function} callback
         */
        offModeChange(callback) {
            Storage.offModeChange(callback);
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncSettings;
}
