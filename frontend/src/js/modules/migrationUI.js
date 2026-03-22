/**
 * StudyHub 数据迁移工具 UI
 * 提供数据迁移的界面交互
 * @module MigrationUI
 */

const MigrationUI = (function() {
    'use strict';

    // 当前步骤
    let currentStep = 1;
    let selectedStrategy = 'merge';
    let migrationResult = null;

    // =============================================
    // 步骤 1: 数据检测
    // =============================================

    function renderStep1() {
        const info = Migration.getLocalDataInfo();
        
        if (!info.hasLocalData) {
            return `
                <div class="migration-empty">
                    <div class="migration-icon">📭</div>
                    <p>未检测到本地数据</p>
                    <p class="migration-hint">您可以直接在云端创建新数据</p>
                </div>
            `;
        }

        return `
            <div class="migration-stats">
                <div class="migration-stat-item">
                    <span class="stat-icon">🔗</span>
                    <span class="stat-label">链接</span>
                    <span class="stat-value">${info.stats.links.count} 个</span>
                    <span class="stat-size">${formatBytes(info.stats.links.size)}</span>
                </div>
                <div class="migration-stat-item">
                    <span class="stat-icon">📁</span>
                    <span class="stat-label">分类</span>
                    <span class="stat-value">${info.stats.categories.count} 个</span>
                    <span class="stat-size">${formatBytes(info.stats.categories.size)}</span>
                </div>
                <div class="migration-stat-item">
                    <span class="stat-icon">✅</span>
                    <span class="stat-label">任务</span>
                    <span class="stat-value">${info.stats.tasks.count} 个</span>
                    <span class="stat-size">${formatBytes(info.stats.tasks.size)}</span>
                </div>
            </div>
            <p class="migration-hint">检测到本地数据，可以选择上传到云端进行同步</p>
        `;
    }

    // =============================================
    // 步骤 2: 选择策略
    // =============================================

    function renderStep2() {
        return `
            <div class="migration-strategy">
                <label class="strategy-option ${selectedStrategy === 'merge' ? 'selected' : ''}">
                    <input type="radio" name="strategy" value="merge" ${selectedStrategy === 'merge' ? 'checked' : ''}>
                    <div class="strategy-content">
                        <span class="strategy-icon">🔄</span>
                        <span class="strategy-title">合并数据</span>
                        <span class="strategy-desc">保留云端现有数据，只添加本地的新数据</span>
                    </div>
                </label>
                <label class="strategy-option ${selectedStrategy === 'overwrite' ? 'selected' : ''}">
                    <input type="radio" name="strategy" value="overwrite" ${selectedStrategy === 'overwrite' ? 'checked' : ''}>
                    <div class="strategy-content">
                        <span class="strategy-icon">⚠️</span>
                        <span class="strategy-title">覆盖数据</span>
                        <span class="strategy-desc">清空云端现有数据，使用本地数据替换</span>
                    </div>
                </label>
            </div>
        `;
    }

    // =============================================
    // 步骤 3: 迁移进度
    // =============================================

    function renderStep3() {
        return `
            <div class="migration-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="migrationProgressFill" style="width: 0%"></div>
                </div>
                <p class="progress-text" id="migrationProgressText">准备上传...</p>
            </div>
        `;
    }

    // =============================================
    // 步骤 4: 迁移结果
    // =============================================

    function renderStep4() {
        if (!migrationResult) {
            return '<p>迁移结果加载中...</p>';
        }

        if (!migrationResult.success) {
            return `
                <div class="migration-result error">
                    <div class="result-icon">❌</div>
                    <p class="result-message">${migrationResult.message || '迁移失败'}</p>
                    ${migrationResult.errors && migrationResult.errors.length > 0 ? `
                        <div class="result-errors">
                            <p>错误详情：</p>
                            <ul>
                                ${migrationResult.errors.map(e => `<li>${e}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        const summary = migrationResult.summary || {};
        return `
            <div class="migration-result success">
                <div class="result-icon">✅</div>
                <p class="result-message">${migrationResult.message || '迁移成功'}</p>
                <div class="result-stats">
                    <div class="result-stat">
                        <span class="stat-label">分类</span>
                        <span class="stat-detail">新增 ${summary.categories?.added || 0}</span>
                        <span class="stat-detail">更新 ${summary.categories?.updated || 0}</span>
                    </div>
                    <div class="result-stat">
                        <span class="stat-label">链接</span>
                        <span class="stat-detail">新增 ${summary.links?.added || 0}</span>
                        <span class="stat-detail">更新 ${summary.links?.updated || 0}</span>
                    </div>
                    <div class="result-stat">
                        <span class="stat-label">任务</span>
                        <span class="stat-detail">新增 ${summary.tasks?.added || 0}</span>
                        <span class="stat-detail">更新 ${summary.tasks?.updated || 0}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // =============================================
    // 工具函数
    // =============================================

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getStepTitle() {
        const titles = ['', '数据检测', '选择策略', '正在迁移', '迁移完成'];
        return titles[currentStep] || '';
    }

    function getStepContent() {
        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            default: return '';
        }
    }

    function getButtons() {
        const info = Migration.getLocalDataInfo();
        
        switch (currentStep) {
            case 1:
                if (!info.hasLocalData) {
                    return [{ text: '关闭', close: true }];
                }
                return [
                    { text: '取消', close: true },
                    { text: '下一步', primary: true, onClick: () => goToStep(2) }
                ];
            case 2:
                return [
                    { text: '上一步', onClick: () => goToStep(1) },
                    { text: '开始迁移', primary: true, onClick: () => startMigration() }
                ];
            case 3:
                return []; // 迁移中不显示按钮
            case 4:
                return [
                    { text: '关闭', primary: true, close: true, onClick: () => {
                        // 刷新页面以加载云端数据
                        if (migrationResult && migrationResult.success) {
                            window.location.reload();
                        }
                    }}
                ];
            default:
                return [];
        }
    }

    // =============================================
    // 步骤控制
    // =============================================

    function goToStep(step) {
        currentStep = step;
        updateModal();
    }

    function updateModal() {
        const modal = document.getElementById('migrationModal');
        if (!modal) return;

        const title = modal.querySelector('.modal-title');
        const content = modal.querySelector('.modal-content');
        const footer = modal.querySelector('.modal-footer');

        if (title) title.textContent = `数据迁移 - ${getStepTitle()}`;
        if (content) content.innerHTML = getStepContent();
        if (footer) {
            footer.innerHTML = '';
            const buttons = getButtons();
            buttons.forEach(btn => {
                const button = document.createElement('button');
                button.textContent = btn.text;
                button.className = btn.primary ? 'btn-primary' : '';
                button.addEventListener('click', () => {
                    if (btn.onClick) btn.onClick();
                    if (btn.close) Modal.close('migrationModal');
                });
                footer.appendChild(button);
            });
        }

        // 绑定策略选择事件
        if (currentStep === 2) {
            const radios = modal.querySelectorAll('input[name="strategy"]');
            radios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    selectedStrategy = e.target.value;
                    updateModal();
                });
            });
        }
    }

    // =============================================
    // 迁移执行
    // =============================================

    async function startMigration() {
        goToStep(3);

        const progressFill = document.getElementById('migrationProgressFill');
        const progressText = document.getElementById('migrationProgressText');

        try {
            // 模拟进度
            if (progressFill) progressFill.style.width = '30%';
            if (progressText) progressText.textContent = '正在准备数据...';

            await new Promise(resolve => setTimeout(resolve, 500));

            if (progressFill) progressFill.style.width = '60%';
            if (progressText) progressText.textContent = '正在上传到云端...';

            // 执行上传
            const result = await Migration.uploadToCloud(selectedStrategy);
            migrationResult = result;

            if (progressFill) progressFill.style.width = '100%';
            if (progressText) progressText.textContent = '迁移完成';

            await new Promise(resolve => setTimeout(resolve, 500));

            goToStep(4);
        } catch (error) {
            migrationResult = {
                success: false,
                message: error.message || '迁移失败'
            };
            goToStep(4);
        }
    }

    // =============================================
    // 公共 API
    // =============================================

    return {
        /**
         * 打开迁移模态框
         */
        open() {
            currentStep = 1;
            selectedStrategy = 'merge';
            migrationResult = null;

            const info = Migration.getLocalDataInfo();
            
            Modal.open({
                id: 'migrationModal',
                title: '数据迁移 - 数据检测',
                content: getStepContent(),
                buttons: getButtons(),
                closeOnOverlay: false,
                onClose: () => {
                    currentStep = 1;
                    migrationResult = null;
                }
            });
        },

        /**
         * 打开导入文件对话框
         */
        openImport() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    const result = await Migration.importLocalFile(file, 'merge');
                    Toast.show(`导入成功！共导入 ${result.stats.links} 个链接, ${result.stats.tasks} 个任务`, 'success');
                    // 刷新数据
                    LinkManager.reload();
                    TaskManager.reload();
                    App.renderLinks();
                    App.renderTasks();
                } catch (error) {
                    Toast.show('导入失败: ' + error.message, 'error');
                }
            };

            input.click();
        },

        /**
         * 导出数据
         * @param {string} version - 导出格式版本
         */
        export(version = '2.0') {
            try {
                Migration.exportLocalData('json', version);
                Toast.show('数据导出成功', 'success');
            } catch (error) {
                Toast.show('导出失败: ' + error.message, 'error');
            }
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MigrationUI;
}
