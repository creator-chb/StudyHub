/**
 * StudyHub 懒加载模块
 * 提供无限滚动、分页加载和图片懒加载功能
 * @module LazyLoader
 */

const LazyLoader = (function() {
    'use strict';

    /**
     * 分页加载状态存储
     * @type {Map}
     */
    const paginationStates = new Map();

    /**
     * 图片懒加载观察器
     * @type {IntersectionObserver|null}
     */
    let imageObserver = null;

    /**
     * 默认配置
     */
    const DEFAULT_CONFIG = {
        pageSize: 20,
        threshold: 200, // 距离底部多少像素开始加载
        loadingClass: 'lazy-loading',
        loadedClass: 'lazy-loaded',
        errorClass: 'lazy-error'
    };

    // =============================================
    // 分页加载
    // =============================================

    /**
     * 初始化分页加载
     * @param {Object} options - 配置选项
     * @param {string} options.containerId - 容器元素 ID
     * @param {string} options.type - 数据类型 ('links' | 'tasks')
     * @param {Function} options.renderFn - 渲染函数
     * @param {Function} options.fetchFn - 数据获取函数
     * @param {number} [options.pageSize] - 每页数量
     * @param {Object} [options.filters] - 过滤条件
     * @returns {Object} 控制器对象
     */
    function initPagination(options) {
        const {
            containerId,
            type,
            renderFn,
            fetchFn,
            pageSize = DEFAULT_CONFIG.pageSize,
            filters = {}
        } = options;

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`[LazyLoader] 容器 #${containerId} 不存在`);
            return null;
        }

        // 初始化状态
        const state = {
            type,
            container,
            renderFn,
            fetchFn,
            pageSize,
            filters,
            currentPage: 1,
            totalItems: 0,
            totalPages: 0,
            loading: false,
            hasMore: true,
            items: []
        };

        paginationStates.set(containerId, state);

        // 创建加载指示器
        createLoadingIndicator(container);

        // 监听滚动事件
        setupScrollListener(containerId);

        // 返回控制器
        return {
            load: () => loadPage(containerId),
            loadMore: () => loadNextPage(containerId),
            refresh: () => refreshData(containerId),
            setFilters: (newFilters) => setFilters(containerId, newFilters),
            getState: () => ({ ...state }),
            destroy: () => destroyPagination(containerId)
        };
    }

    /**
     * 创建加载指示器
     * @param {HTMLElement} container - 容器元素
     */
    function createLoadingIndicator(container) {
        const indicator = document.createElement('div');
        indicator.className = 'lazy-load-indicator';
        indicator.innerHTML = `
            <div class="lazy-load-spinner"></div>
            <span>加载中...</span>
        `;
        indicator.style.display = 'none';
        container.appendChild(indicator);
    }

    /**
     * 设置滚动监听
     * @param {string} containerId - 容器 ID
     */
    function setupScrollListener(containerId) {
        const state = paginationStates.get(containerId);
        if (!state) return;

        const scrollHandler = Utils.throttle(() => {
            checkAndLoadMore(containerId);
        }, 200);

        // 使用父级容器或窗口滚动
        const scrollContainer = state.container.closest('.tab-content') || window;
        scrollContainer.addEventListener('scroll', scrollHandler);

        state._scrollHandler = scrollHandler;
        state._scrollContainer = scrollContainer;
    }

    /**
     * 检查并加载更多
     * @param {string} containerId - 容器 ID
     */
    function checkAndLoadMore(containerId) {
        const state = paginationStates.get(containerId);
        if (!state || state.loading || !state.hasMore) return;

        const container = state.container;
        const scrollContainer = state._scrollContainer;

        let scrollBottom, containerBottom;

        if (scrollContainer === window) {
            scrollBottom = window.scrollY + window.innerHeight;
            containerBottom = container.offsetTop + container.offsetHeight;
        } else {
            scrollBottom = scrollContainer.scrollTop + scrollContainer.clientHeight;
            containerBottom = container.offsetTop - scrollContainer.offsetTop + container.offsetHeight;
        }

        // 接近底部时加载更多
        if (scrollBottom >= containerBottom - DEFAULT_CONFIG.threshold) {
            loadNextPage(containerId);
        }
    }

    /**
     * 加载指定页
     * @param {string} containerId - 容器 ID
     * @param {number} [page] - 页码
     */
    async function loadPage(containerId, page) {
        const state = paginationStates.get(containerId);
        if (!state || state.loading) return;

        state.loading = true;
        showLoadingIndicator(containerId);

        try {
            const targetPage = page || state.currentPage;
            const result = await state.fetchFn({
                page: targetPage,
                limit: state.pageSize,
                ...state.filters
            });

            if (result.success) {
                const { items, pagination } = extractData(result, state.type);

                state.items = targetPage === 1 ? items : [...state.items, ...items];
                state.currentPage = pagination.page;
                state.totalItems = pagination.total;
                state.totalPages = pagination.totalPages;
                state.hasMore = pagination.page < pagination.totalPages;

                // 渲染项目
                renderItems(containerId, items, targetPage === 1);
            } else {
                showLoadError(containerId, result.message || '加载失败');
            }
        } catch (error) {
            console.error('[LazyLoader] 加载错误:', error);
            showLoadError(containerId, error.message);
        } finally {
            state.loading = false;
            hideLoadingIndicator(containerId);
        }
    }

    /**
     * 加载下一页
     * @param {string} containerId - 容器 ID
     */
    async function loadNextPage(containerId) {
        const state = paginationStates.get(containerId);
        if (!state || state.loading || !state.hasMore) return;

        await loadPage(containerId, state.currentPage + 1);
    }

    /**
     * 刷新数据
     * @param {string} containerId - 容器 ID
     */
    async function refreshData(containerId) {
        const state = paginationStates.get(containerId);
        if (!state) return;

        state.currentPage = 1;
        state.items = [];
        state.hasMore = true;

        await loadPage(containerId, 1);
    }

    /**
     * 设置过滤条件并刷新
     * @param {string} containerId - 容器 ID
     * @param {Object} filters - 新的过滤条件
     */
    async function setFilters(containerId, filters) {
        const state = paginationStates.get(containerId);
        if (!state) return;

        state.filters = { ...filters };
        await refreshData(containerId);
    }

    /**
     * 从响应中提取数据
     * @param {Object} result - API 响应
     * @param {string} type - 数据类型
     * @returns {Object} 提取的数据
     */
    function extractData(result, type) {
        const data = result.data || {};

        switch (type) {
            case 'links':
                return {
                    items: data.links || [],
                    pagination: data.pagination || { page: 1, total: 0, totalPages: 0 }
                };
            case 'tasks':
                // 任务可能分为 pending 和 completed
                if (data.tasks) {
                    return {
                        items: data.tasks,
                        pagination: data.pagination || { page: 1, total: 0, totalPages: 0 }
                    };
                }
                // 或者分开返回
                const pending = data.pending || [];
                const completed = data.completed || [];
                return {
                    items: [...pending, ...completed],
                    pagination: { page: 1, total: pending.length + completed.length, totalPages: 1 }
                };
            default:
                return {
                    items: Array.isArray(data) ? data : [],
                    pagination: { page: 1, total: 0, totalPages: 0 }
                };
        }
    }

    /**
     * 渲染项目
     * @param {string} containerId - 容器 ID
     * @param {Array} items - 项目列表
     * @param {boolean} clearFirst - 是否先清空容器
     */
    function renderItems(containerId, items, clearFirst) {
        const state = paginationStates.get(containerId);
        if (!state) return;

        const container = state.container;

        if (clearFirst) {
            // 清空容器，但保留加载指示器
            const indicator = container.querySelector('.lazy-load-indicator');
            container.innerHTML = '';
            if (indicator) {
                container.appendChild(indicator);
            }
        }

        // 使用 DocumentFragment 批量添加
        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            const element = state.renderFn(item);
            if (element) {
                fragment.appendChild(element);
            }
        });

        // 在加载指示器之前插入
        const indicator = container.querySelector('.lazy-load-indicator');
        if (indicator) {
            container.insertBefore(fragment, indicator);
        } else {
            container.appendChild(fragment);
        }

        // 显示"没有更多"提示
        if (!state.hasMore && state.items.length > 0) {
            showNoMoreIndicator(containerId);
        }
    }

    /**
     * 显示加载指示器
     * @param {string} containerId - 容器 ID
     */
    function showLoadingIndicator(containerId) {
        const state = paginationStates.get(containerId);
        if (!state) return;

        const indicator = state.container.querySelector('.lazy-load-indicator');
        if (indicator) {
            indicator.style.display = 'flex';
        }
    }

    /**
     * 隐藏加载指示器
     * @param {string} containerId - 容器 ID
     */
    function hideLoadingIndicator(containerId) {
        const state = paginationStates.get(containerId);
        if (!state) return;

        const indicator = state.container.querySelector('.lazy-load-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    /**
     * 显示加载错误
     * @param {string} containerId - 容器 ID
     * @param {string} message - 错误消息
     */
    function showLoadError(containerId, message) {
        const state = paginationStates.get(containerId);
        if (!state) return;

        const indicator = state.container.querySelector('.lazy-load-indicator');
        if (indicator) {
            indicator.innerHTML = `
                <span class="lazy-load-error">${Utils.escapeHtml(message)}</span>
                <button class="lazy-load-retry" onclick="LazyLoader.retry('${containerId}')">重试</button>
            `;
            indicator.style.display = 'flex';
        }
    }

    /**
     * 显示"没有更多"提示
     * @param {string} containerId - 容器 ID
     */
    function showNoMoreIndicator(containerId) {
        const state = paginationStates.get(containerId);
        if (!state) return;

        const indicator = state.container.querySelector('.lazy-load-indicator');
        if (indicator) {
            indicator.innerHTML = '<span class="lazy-load-end">已加载全部</span>';
            indicator.style.display = 'flex';
        }
    }

    /**
     * 重试加载
     * @param {string} containerId - 容器 ID
     */
    function retry(containerId) {
        const state = paginationStates.get(containerId);
        if (!state) return;

        // 恢复加载指示器
        const indicator = state.container.querySelector('.lazy-load-indicator');
        if (indicator) {
            indicator.innerHTML = `
                <div class="lazy-load-spinner"></div>
                <span>加载中...</span>
            `;
        }

        loadPage(containerId);
    }

    /**
     * 销毁分页加载
     * @param {string} containerId - 容器 ID
     */
    function destroyPagination(containerId) {
        const state = paginationStates.get(containerId);
        if (!state) return;

        // 移除滚动监听
        if (state._scrollContainer && state._scrollHandler) {
            state._scrollContainer.removeEventListener('scroll', state._scrollHandler);
        }

        paginationStates.delete(containerId);
    }

    // =============================================
    // 图片懒加载
    // =============================================

    /**
     * 初始化图片懒加载
     */
    function initImageLazyLoad() {
        if (!('IntersectionObserver' in window)) {
            // 不支持 IntersectionObserver，直接加载所有图片
            document.querySelectorAll('img[data-src]').forEach(loadImage);
            return;
        }

        imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadImage(entry.target);
                    imageObserver.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });

        // 观察所有带 data-src 的图片
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    /**
     * 加载图片
     * @param {HTMLImageElement} img - 图片元素
     */
    function loadImage(img) {
        const src = img.dataset.src;
        if (!src) return;

        img.classList.add(DEFAULT_CONFIG.loadingClass);

        const tempImg = new Image();
        tempImg.onload = () => {
            img.src = src;
            img.classList.remove(DEFAULT_CONFIG.loadingClass);
            img.classList.add(DEFAULT_CONFIG.loadedClass);
            delete img.dataset.src;
        };

        tempImg.onerror = () => {
            img.classList.remove(DEFAULT_CONFIG.loadingClass);
            img.classList.add(DEFAULT_CONFIG.errorClass);
            img.src = 'data:image/svg+xml,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
                    <rect fill="#f0f0f0" width="100" height="100"/>
                    <text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999" font-size="14">加载失败</text>
                </svg>
            `);
        };

        tempImg.src = src;
    }

    /**
     * 观察新图片
     * @param {HTMLImageElement} img - 图片元素
     */
    function observeImage(img) {
        if (imageObserver && img.dataset.src) {
            imageObserver.observe(img);
        } else if (img.dataset.src) {
            loadImage(img);
        }
    }

    // =============================================
    // 公开 API
    // =============================================

    return {
        // 分页加载
        initPagination,
        loadPage,
        loadNextPage,
        refreshData,
        setFilters,
        retry,
        destroyPagination,

        // 图片懒加载
        initImageLazyLoad,
        observeImage,

        // 状态查询
        getState: (containerId) => {
            const state = paginationStates.get(containerId);
            return state ? { ...state } : null;
        },

        // 配置
        config: (options) => {
            Object.assign(DEFAULT_CONFIG, options);
        }
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LazyLoader;
}
