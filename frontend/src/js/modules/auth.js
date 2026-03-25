/**
 * StudyHub 认证模块
 * 处理用户登录、注册界面和状态管理
 * @module auth
 */

const Auth = (function() {
    'use strict';

    // DOM 元素缓存
    let authModal = null;
    let loginForm = null;
    let registerForm = null;
    let userInfoElement = null;

    // 当前视图: 'login' | 'register'
    let currentView = 'login';

    // 回调函数
    const listeners = new Set();

    // =============================================
    // 初始化
    // =============================================

    /**
     * 初始化认证模块
     */
    function init() {
        createAuthModal();
        updateAuthUI();
    }

    /**
     * 创建认证模态框
     */
    function createAuthModal() {
        // 检查是否已存在
        if (document.getElementById('authModal')) {
            authModal = document.getElementById('authModal');
            return;
        }

        const modalHtml = `
            <div id="authModal" class="modal">
                <div class="modal-content auth-modal">
                    <button class="modal-close" id="authModalClose">&times;</button>
                    <div class="auth-tabs">
                        <button class="auth-tab active" data-view="login">登录</button>
                        <button class="auth-tab" data-view="register">注册</button>
                    </div>
                    <!-- 登录表单 -->
                    <form id="loginForm" class="auth-form">
                        <div class="form-group">
                            <label for="loginEmail">邮箱</label>
                            <input type="email" id="loginEmail" name="email" required placeholder="请输入邮箱">
                        </div>
                        <div class="form-group">
                            <label for="loginPassword">密码</label>
                            <input type="password" id="loginPassword" name="password" required placeholder="请输入密码">
                        </div>
                        <div class="form-error" id="loginError"></div>
                        <button type="submit" class="btn-primary btn-full">登录</button>
                    </form>
                    <!-- 注册表单 -->
                    <form id="registerForm" class="auth-form" style="display: none;">
                        <div class="form-group">
                            <label for="registerEmail">邮箱</label>
                            <input type="email" id="registerEmail" name="email" required placeholder="请输入邮箱">
                        </div>
                        <div class="form-group">
                            <label for="registerUsername">用户名</label>
                            <input type="text" id="registerUsername" name="username" required placeholder="请输入用户名" minlength="2" maxlength="20">
                        </div>
                        <div class="form-group">
                            <label for="registerPassword">密码</label>
                            <input type="password" id="registerPassword" name="password" required placeholder="请输入密码（至少6位）" minlength="6">
                        </div>
                        <div class="form-group">
                            <label for="registerConfirmPassword">确认密码</label>
                            <input type="password" id="registerConfirmPassword" name="confirmPassword" required placeholder="请再次输入密码">
                        </div>
                        <div class="form-error" id="registerError"></div>
                        <button type="submit" class="btn-primary btn-full">注册</button>
                    </form>
                </div>
            </div>
        `;

        // 添加到 DOM
        const container = document.createElement('div');
        container.innerHTML = modalHtml;
        document.body.appendChild(container.firstElementChild);

        // 获取元素引用
        authModal = document.getElementById('authModal');
        loginForm = document.getElementById('loginForm');
        registerForm = document.getElementById('registerForm');

        // 绑定事件
        bindEvents();
    }

    /**
     * 绑定事件
     */
    function bindEvents() {
        // 关闭按钮
        document.getElementById('authModalClose').addEventListener('click', closeModal);

        // 点击遮罩关闭
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                closeModal();
            }
        });

        // Tab 切换
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                switchView(view);
            });
        });

        // 登录表单提交
        loginForm.addEventListener('submit', handleLogin);

        // 注册表单提交
        registerForm.addEventListener('submit', handleRegister);
    }

    // =============================================
    // 视图切换
    // =============================================

    /**
     * 切换视图
     */
    function switchView(view) {
        currentView = view;

        // 更新 Tab 状态
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === view);
        });

        // 显示/隐藏表单
        loginForm.style.display = view === 'login' ? 'block' : 'none';
        registerForm.style.display = view === 'register' ? 'block' : 'none';

        // 清除错误信息
        clearErrors();
    }

    // =============================================
    // 表单处理
    // =============================================

    /**
     * 处理登录
     */
    async function handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');

        try {
            const response = await ApiClient.login(email, password);

            if (response.success) {
                Toast.show('登录成功', 'success');
                closeModal();
                updateAuthUI();
                
                // 登录成功后切换到 API 存储模式
                if (typeof Storage !== 'undefined' && Storage.switchMode) {
                    try {
                        const result = await Storage.switchMode('api');
                        console.log('[Auth] 切换到 API 模式:', result);
                    } catch (e) {
                        console.error('[Auth] 切换存储模式失败:', e);
                    }
                }
                
                notifyListeners('login', response.data.user);
            }
        } catch (error) {
            errorEl.textContent = error.message || '登录失败，请检查邮箱和密码';
            errorEl.style.display = 'block';
        }
    }

    /**
     * 处理注册
     */
    async function handleRegister(e) {
        e.preventDefault();

        const email = document.getElementById('registerEmail').value.trim();
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const errorEl = document.getElementById('registerError');

        // 验证密码
        if (password !== confirmPassword) {
            errorEl.textContent = '两次输入的密码不一致';
            errorEl.style.display = 'block';
            return;
        }

        try {
            const response = await ApiClient.register(email, username, password);

            if (response.success) {
                Toast.show('注册成功', 'success');
                closeModal();
                updateAuthUI();
                notifyListeners('register', response.data.user);
            }
        } catch (error) {
            errorEl.textContent = error.message || '注册失败，请稍后重试';
            errorEl.style.display = 'block';
        }
    }

    /**
     * 清除错误信息
     */
    function clearErrors() {
        document.querySelectorAll('.form-error').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
    }

    // =============================================
    // 模态框控制
    // =============================================

    /**
     * 打开模态框
     * @param {string} view - 初始视图
     */
    function openModal(view = 'login') {
        if (!authModal) {
            createAuthModal();
        }

        switchView(view);
        authModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * 关闭模态框
     */
    function closeModal() {
        if (authModal) {
            authModal.classList.remove('active');
            document.body.style.overflow = '';
            // 重置表单
            loginForm.reset();
            registerForm.reset();
            clearErrors();
        }
    }

    /**
     * 打开登录模态框
     */
    function openLogin() {
        openModal('login');
    }

    /**
     * 打开注册模态框
     */
    function openRegister() {
        openModal('register');
    }

    // =============================================
    // UI 更新
    // =============================================

    /**
     * 更新认证 UI
     */
    function updateAuthUI() {
        const isLoggedIn = ApiClient.isAuthenticated();
        const user = ApiClient.getUser();

        // 更新头部按钮
        const headerActions = document.querySelector('.app-actions');

        if (isLoggedIn) {
            // 已登录状态
            let userInfo = headerActions.querySelector('.user-info');
            if (!userInfo) {
                userInfo = document.createElement('div');
                userInfo.className = 'user-info';
                userInfo.innerHTML = `
                    <span class="user-name"></span>
                    <button id="btnLogout" class="btn-secondary btn-small">登出</button>
                `;
                headerActions.appendChild(userInfo);

                // 绑定登出事件
                document.getElementById('btnLogout').addEventListener('click', handleLogout);
            }

            userInfo.querySelector('.user-name').textContent = user?.username || user?.email || '用户';
            userInfo.style.display = 'flex';
        } else {
            // 未登录状态
            const userInfo = headerActions.querySelector('.user-info');
            if (userInfo) {
                userInfo.style.display = 'none';
            }
        }
    }

    /**
     * 处理登出
     */
    async function handleLogout() {
        try {
            // 先切换回本地模式，避免后续操作触发 API 请求
            if (typeof Storage !== 'undefined' && Storage.switchMode) {
                try {
                    await Storage.switchMode('local');
                    console.log('[Auth] 已切换到本地模式');
                } catch (e) {
                    console.error('[Auth] 切换本地模式失败:', e);
                }
            }
            
            await ApiClient.logout();
            Toast.show('已登出', 'success');
            updateAuthUI();
            notifyListeners('logout');
        } catch (error) {
            console.error('[Auth] 登出错误:', error);
        }
    }

    // =============================================
    // 事件订阅
    // =============================================

    /**
     * 订阅认证状态变更
     * @param {Function} callback - 回调函数
     */
    function subscribe(callback) {
        listeners.add(callback);
    }

    /**
     * 取消订阅
     * @param {Function} callback - 回调函数
     */
    function unsubscribe(callback) {
        listeners.delete(callback);
    }

    /**
     * 通知监听器
     * @param {string} event - 事件类型
     * @param {Object} data - 事件数据
     */
    function notifyListeners(event, data) {
        listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (e) {
                console.error('[Auth] 监听器错误:', e);
            }
        });
    }

    // =============================================
    // 公开 API
    // =============================================

    return {
        init,
        openLogin,
        openRegister,
        openModal,
        closeModal,
        logout: handleLogout,
        isAuthenticated: () => ApiClient.isAuthenticated(),
        getUser: () => ApiClient.getUser(),
        subscribe,
        unsubscribe,
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
