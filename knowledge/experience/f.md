# StudyHub 协作开发经验总结与技术规范

> 本文档记录了 StudyHub 项目从纯前端向全栈演进过程中的核心架构设计、问题解决方案和开发规范，为后续开发提供全面参考。

---

## 目录

1. [架构概览](#一架构概览)
2. [模块依赖关系](#二模块依赖关系)
3. [存储层架构设计](#三存储层架构设计)
4. [初始化流程与时序管理](#四初始化流程与时序管理)
5. [数据同步机制](#五数据同步机制)
6. [常见问题与解决方案](#六常见问题与解决方案)
7. [开发规范与最佳实践](#七开发规范与最佳实践)
8. [问题排查指南](#八问题排查指南)
9. [后续改进方向](#九后续改进方向)

---

## 一、架构概览

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              应用层 (App)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ LinkManager │  │TaskManager  │  │   Renderer  │  │  SyncSettings   │ │
│  │  (链接管理)  │  │  (任务管理)  │  │  (UI渲染)   │  │   (同步设置)     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
│         │                │                │                  │          │
│         └────────────────┴────────────────┘                  │          │
│                          │                                   │          │
│                          ▼                                   ▼          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                      存储抽象层 (Storage)                            ││
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  ││
│  │  │LocalStorage     │    │ ApiStorage      │    │  模式管理/切换   │  ││
│  │  │  Adapter        │◄──►│  Adapter        │    │                 │  ││
│  │  │  (本地模式)      │    │  (云端模式)      │    │  - switchMode   │  ││
│  │  └─────────────────┘    └─────────────────┘    │  - onModeChange │  ││
│  │           │                      │             │  - getMode      │  ││
│  │           │                      │             └─────────────────┘  ││
│  │           │                      ▼                                  ││
│  │           │           ┌─────────────────┐                           ││
│  │           │           │   ApiClient     │                           ││
│  │           │           │  (API 客户端)    │                           ││
│  │           │           └────────┬────────┘                           ││
│  │           │                    │                                    ││
│  │           ▼                    ▼                                    ││
│  │    ┌─────────────┐      ┌─────────────┐                             ││
│  │    │ localStorage│      │  Backend    │                             ││
│  │    │  (浏览器)    │      │  (后端 API)  │                             ││
│  │    └─────────────┘      └─────────────┘                             ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

| 原则 | 说明 | 实现方式 |
|------|------|----------|
| **单一数据入口** | 所有数据操作必须通过 Storage 层 | LinkManager/TaskManager 通过 Storage API 操作数据 |
| **适配器模式** | 统一接口，不同实现 | AbstractStorage 定义接口，Local/Api Adapter 分别实现 |
| **延迟初始化** | 避免模块加载时的时序问题 | Storage.init() 显式调用，而非模块加载时自动执行 |
| **数据缓存** | API 模式下缓存服务器数据 | ApiStorageAdapter 维护内存缓存，减少请求次数 |
| **格式转换隔离** | 前后端数据格式差异在适配器层处理 | ApiStorageAdapter 负责 snake_case ↔ camelCase 转换 |

---

## 二、模块依赖关系

### 2.1 依赖关系图

```
                    ┌─────────────────┐
                    │   index.html    │
                    │  (应用入口)      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ DOMContentLoaded │
                    │   (初始化入口)   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Storage.init  │   │  Auth.init    │   │ UI 初始化     │
│   (最先执行)   │   │               │   │               │
└───────┬───────┘   └───────┬───────┘   └───────────────┘
        │                   │
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│ LinkManager   │   │  Auth UI      │
│ TaskManager   │   │  (登录/注册)   │
│ (reload)      │   │               │
└───────┬───────┘   └───────┬───────┘
        │                   │
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│ App.renderXxx │   │ 登录成功回调   │
│               │   │               │
│ - renderLinks │   │ - switchMode  │
│ - renderTasks │   │ - reload数据  │
└───────────────┘   └───────────────┘
```

### 2.2 模块职责说明

| 模块 | 职责 | 依赖 |
|------|------|------|
| **Storage** | 存储模式管理、适配器切换、数据操作代理 | LocalStorageAdapter, ApiStorageAdapter |
| **LocalStorageAdapter** | 本地存储实现 (localStorage) | AbstractStorage |
| **ApiStorageAdapter** | API 存储实现 (后端同步) | AbstractStorage, ApiClient |
| **ApiClient** | HTTP 请求封装、Token 管理、认证 API | 无 |
| **LinkManager** | 链接业务逻辑、数据验证、状态管理 | Storage |
| **TaskManager** | 任务业务逻辑、数据验证、状态管理 | Storage |
| **Auth** | 登录/注册 UI、认证状态管理 | ApiClient |
| **SyncSettings** | 同步设置 UI、模式切换交互 | Storage, ApiClient |
| **Renderer** | DOM 渲染、事件绑定、UI 更新 | LinkManager, TaskManager |

---

## 三、存储层架构设计

### 3.1 抽象存储接口 (AbstractStorage)

```javascript
// AbstractStorage 定义的标准接口
{
  // 核心数据操作（子类必须实现）
  get(key, defaultValue)      // 读取数据
  set(key, value)             // 保存数据
  remove(key)                 // 删除数据
  clear()                     // 清空数据
  getUsage()                  // 获取存储使用情况
  
  // 事件系统（共享实现）
  subscribe(key, callback)    // 订阅数据变更
  unsubscribe(key, callback)  // 取消订阅
  _emit(key, data)            // 触发事件（内部方法）
  
  // 辅助方法（默认实现）
  exportAll()                 // 导出所有数据
  importAll(data, options)    // 导入数据
  validateImport(data)        // 验证导入数据
  formatBytes(bytes)          // 格式化字节大小
}
```

### 3.2 存储适配器对比

| 特性 | LocalStorageAdapter | ApiStorageAdapter |
|------|---------------------|-------------------|
| **数据存储位置** | 浏览器 localStorage | 后端数据库 |
| **数据持久化** | 本地持久 | 云端持久，多端同步 |
| **读取方式** | 同步读取 | 从内存缓存同步读取 |
| **写入方式** | 同步写入 localStorage | 异步 API 请求 |
| **初始化要求** | 无需初始化 | 需要登录态，调用 sync() |
| **数据格式** | 前端 camelCase | 后端 snake_case，适配器转换 |
| **缓存机制** | 无 | 内存缓存 + 服务端数据 |
| **适用场景** | 离线使用、快速体验 | 多设备同步、数据备份 |

### 3.3 数据格式转换

后端使用 `snake_case`，前端使用 `camelCase`，转换在 `ApiStorageAdapter` 中统一处理：

```javascript
// 后端返回格式
{
  "id": "abc123",
  "title": "示例链接",
  "url": "https://example.com",
  "is_pinned": true,
  "pinned_at": "2026-03-22T10:00:00Z",
  "category_id": "cat_001",
  "created_at": "2026-03-20T08:00:00Z"
}

// 转换为前端格式
{
  "id": "abc123",
  "name": "示例链接",           // title → name
  "url": "https://example.com",
  "pinned": true,                // is_pinned → pinned
  "pinnedAt": 1711101600000,     // pinned_at → pinnedAt (timestamp)
  "categoryId": "cat_001",       // category_id → categoryId
  "createdAt": "2026-03-20T08:00:00Z"
}
```

### 3.4 缓存机制 (ApiStorageAdapter)

```javascript
// 内存缓存结构
const cache = {
  links: [],        // 链接数据
  categories: [],   // 分类数据
  tasks: [],        // 任务数据
  settings: {},     // 设置数据
  lastSync: null    // 最后同步时间
};

// 同步状态
const syncState = {
  isSyncing: false,         // 是否正在同步
  lastError: null,          // 最后错误信息
  pendingOperations: []     // 待处理操作队列
};
```

**缓存策略**：
- 读取操作：直接从 `cache` 返回，零延迟
- 写入操作：先调用 API，成功后更新 `cache`，再触发事件
- 初始化时：调用 `sync()` 从服务器拉取全量数据填充缓存

---

## 四、初始化流程与时序管理

### 4.1 正确的初始化顺序

```javascript
// index.html 中的正确初始化流程
document.addEventListener('DOMContentLoaded', async () => {
  // 1. 初始化存储模块（必须最先执行）
  await Storage.init();
  
  // 2. 初始化认证模块
  Auth.init();
  
  // 3. 根据认证状态初始化 UI
  if (Auth.isAuthenticated()) {
    // 已登录：确保数据已加载
    if (Storage.getMode() === 'api') {
      LinkManager.reload();
      TaskManager.reload();
      App.renderLinks();
      App.renderTasks();
    }
  }
  
  // 4. 绑定事件监听
  bindEventListeners();
});
```

### 4.2 Storage.init() 内部逻辑

```javascript
async function init() {
  console.log('[Storage] 开始初始化...');
  
  // 检查配置和登录状态
  const backendSync = Config.get('features.backendSync', false);
  const isAuthenticated = ApiStorageAdapter.isAuthenticated();
  
  if (backendSync && isAuthenticated) {
    // 切换到 API 模式
    currentMode = 'api';
    currentAdapter = ApiStorageAdapter;
    
    // 同步服务器数据
    try {
      const syncResult = await currentAdapter.sync();
      if (!syncResult) {
        // 同步失败，回退到本地模式
        currentMode = 'local';
        currentAdapter = LocalStorageAdapter;
      }
    } catch (e) {
      currentMode = 'local';
      currentAdapter = LocalStorageAdapter;
    }
  } else {
    // 使用本地模式
    currentMode = 'local';
    currentAdapter = LocalStorageAdapter;
  }
}
```

### 4.3 模块加载时序陷阱

**问题**：模块在 IIFE 定义阶段立即调用 `loadData()`，导致时序问题。

```javascript
// ❌ 错误做法 - taskManager.js
const TaskManager = (function() {
  let tasks = [];
  
  function loadData() {
    tasks = Storage.get('tasks', []);  // 此时 Storage 可能未初始化
  }
  
  loadData();  // IIFE 执行时立即调用 - 问题所在！
  
  return { ... };
})();
```

**解决方案**：

```javascript
// ✅ 方案 1：提供 reload() 方法，显式调用
const TaskManager = (function() {
  let tasks = [];
  
  function loadData() {
    tasks = Storage.get('tasks', []);
  }
  
  // 模块加载时不自动加载数据
  // loadData();  // 移除这行
  
  return {
    // ... 其他方法
    reload() {
      loadData();
      notifyListeners();
    }
  };
})();

// 在 Storage.init() 成功后调用
await Storage.init();
LinkManager.reload();
TaskManager.reload();
```

### 4.4 登录/登出状态切换流程

```javascript
// 登录成功后的完整流程
Auth.subscribe(async (event, data) => {
  if (event === 'login' || event === 'register') {
    // 1. 隐藏登录/注册按钮
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    
    // 2. 切换到云端模式
    const result = await Storage.switchMode('api');
    
    if (result.success) {
      // 3. 重新加载数据（从 API 缓存）
      LinkManager.reload();
      TaskManager.reload();
      
      // 4. 重新渲染 UI
      App.renderLinks();
      App.renderTasks();
      
      Toast.show('已切换到云端同步模式', 'success');
    }
  }
});

// 登出后的完整流程
Auth.subscribe(async (event, data) => {
  if (event === 'logout') {
    // 1. 显示登录/注册按钮
    loginBtn.style.display = '';
    registerBtn.style.display = '';
    
    // 2. 切换到本地模式
    await Storage.switchMode('local');
    
    // 3. 重新加载数据（从 localStorage）
    LinkManager.reload();
    TaskManager.reload();
    
    // 4. 重新渲染 UI
    App.renderLinks();
    App.renderTasks();
  }
});
```

---

## 五、数据同步机制

### 5.1 模式切换流程

```javascript
async function switchMode(mode, options = { syncData: false }) {
  if (mode === currentMode) {
    return { success: true, message: '模式未改变' };
  }
  
  const previousMode = currentMode;
  const previousAdapter = currentAdapter;
  
  try {
    if (mode === 'api') {
      // 检查登录状态
      if (!ApiStorageAdapter.isAuthenticated()) {
        return {
          success: false,
          message: '请先登录以使用云端同步功能',
          requireAuth: true
        };
      }
      
      currentAdapter = ApiStorageAdapter;
      
      // 从服务器同步数据
      const syncResult = await currentAdapter.sync();
      if (!syncResult) {
        currentAdapter = previousAdapter;
        return { success: false, message: '数据同步失败' };
      }
    } else {
      currentAdapter = LocalStorageAdapter;
      
      // 可选：从 API 模式同步数据到本地
      if (options.syncData && previousAdapter) {
        const links = previousAdapter.get('links', []);
        const categories = previousAdapter.get('categories', []);
        currentAdapter.set('links', links);
        currentAdapter.set('categories', categories);
      }
    }
    
    currentMode = mode;
    Config.set('features.backendSync', mode === 'api');
    notifyModeChange(mode, previousMode);
    
    return { success: true, message: '切换成功' };
  } catch (e) {
    currentAdapter = previousAdapter;
    return { success: false, message: '切换失败: ' + e.message };
  }
}
```

### 5.2 并发同步处理

```javascript
// 防止重复同步的竞态条件处理
adapter.sync = async function() {
  // 如果正在同步，等待完成而不是返回 false
  if (syncState.isSyncing) {
    console.log('[ApiStorage] 同步正在进行中，等待完成...');
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!syncState.isSyncing) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
      
      // 超时处理
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 10000);
    });
  }
  
  syncState.isSyncing = true;
  syncState.lastError = null;
  
  try {
    // 并行获取所有数据
    const [links, categories, tasks] = await Promise.all([
      fetchLinks(),
      fetchCategories(),
      fetchTasks()
    ]);
    
    cache.links = links;
    cache.categories = categories;
    cache.tasks = tasks;
    cache.lastSync = new Date().toISOString();
    
    this._emit('sync', { links, categories, tasks });
    return true;
  } catch (e) {
    syncState.lastError = e.message;
    return false;
  } finally {
    syncState.isSyncing = false;
  }
};
```

### 5.3 数据操作统一入口

所有数据操作必须通过 Storage 层，确保本地/API 模式行为一致：

```javascript
// LinkManager.add() 示例
add(linkData) {
  // 检查是否为 API 模式
  if (Storage.isApiMode()) {
    // API 模式：返回 Promise
    return Storage.addLink(linkData).then(result => {
      if (result.success) {
        links.push(result.data);
        notifyListeners();
      }
      return result;
    });
  }
  
  // 本地模式：同步操作
  links.push(link);
  saveData();
  return { success: true, data: link };
}
```

---

## 六、常见问题与解决方案

### 6.1 异步流程管理问题

#### 问题 1：存储初始化时序问题

**现象**：页面刷新后数据不显示，控制台报错 `LinkManager is not defined`

**根本原因**：
- `currentAdapter` 初始值为 `null`
- `LinkManager` 在模块加载时就调用 `Storage.get()`
- 此时 `init()` 还未执行

**解决方案**：
```javascript
// 将 currentAdapter 默认值设为 LocalStorageAdapter
let currentAdapter = LocalStorageAdapter;
```

**经验教训**：
- 模块初始化时不应依赖其他模块的异步初始化结果
- 设置合理的默认值，确保系统在任何状态下都有可用行为

#### 问题 2：模块加载顺序问题

**现象**：`initAdapter()` 在模块加载时立即执行，此时依赖模块可能未完全初始化

**解决方案**：
- 移除模块加载时的自动初始化
- 添加 `init()` 公共方法供显式调用
- 在 `DOMContentLoaded` 中按顺序调用

#### 问题 3：数据同步竞态条件

**现象**：初始化和登录同时触发同步，导致冲突返回 `false`

**解决方案**：
```javascript
// 当同步正在进行时等待完成，而不是返回 false
if (syncInProgress) {
  await syncPromise;
  return true;
}
```

### 6.2 数据操作绕过存储层

**现象**：`LinkManager` 的方法直接操作本地数据，云端模式下数据不会同步到后端

**根本原因**：架构设计时未强制统一数据访问路径

**解决方案**：
```javascript
// LinkManager 方法检测当前模式
add(link) {
  if (Storage.getMode() === 'api') {
    return Storage.addLink(link);  // 走 API
  }
  // 本地模式直接操作
}
```

**经验教训**：
- **单一数据入口原则**：所有数据操作必须通过统一的存储层
- 模块职责要清晰，`LinkManager` 负责业务逻辑，`Storage` 负责数据持久化

### 6.3 函数参数传递遗漏

**现象**：编辑按钮点击后模态框信息为空

**根本原因**：
```javascript
// 错误：没传 id 参数
App.openLinkModal();

// 正确：传入 link.id
App.openLinkModal(link.id);
```

### 6.4 登录后未自动同步

**现象**：登录成功后没有调用 `Storage.switchMode('api')`，导致数据不同步

**解决方案**：
```javascript
Auth.subscribe((event, data) => {
  if (event === 'login' || event === 'register') {
    // 切换到云端模式并同步数据
    Storage.switchMode('api').then(result => {
      if (result.success) {
        LinkManager.reload();
        TaskManager.reload();
        App.renderLinks();
        App.renderTasks();
      }
    });
  }
});
```

### 6.5 任务管理后端化问题 (Phase 3)

**现象**：后端 API 能正常返回任务数据，但前端界面无法正确展示。登录后任务列表为空。

**根本原因**：
- `TaskManager` 模块在 IIFE 执行时立即调用 `loadData()`
- 此时 `Storage` 还未初始化，默认使用 `LocalStorageAdapter`
- 登录成功后调用 `Storage.switchMode('api')`，数据被同步到 `ApiStorageAdapter.cache.tasks`
- **但 `TaskManager.tasks` 数组没有更新**，仍持有旧的本地数据
- 代码只调用了 `LinkManager.reload()` 和 `App.renderLinks()`，**遗漏了任务模块**

**解决方案**：
```javascript
// 1. TaskManager 新增 reload() 方法
reload() {
  loadData();        // 从 Storage 重新读取
  notifyListeners(); // 通知 UI 更新
}

// 2. 登录成功后同步任务数据
Storage.switchMode('api').then(result => {
  if (result.success) {
    LinkManager.reload();
    TaskManager.reload();  // 新增
    App.renderLinks();
    App.renderTasks();     // 新增
  }
});

// 3. 已认证用户初始化时也要加载任务
if (Storage.getMode() === 'api') {
  LinkManager.reload();
  TaskManager.reload();  // 新增
  App.renderLinks();
  App.renderTasks();     // 新增
}
```

### 6.6 异步操作未等待完成

**现象**：`renderer.js` 中删除和置顶操作未使用 `async/await`，导致错误无法正确捕获和提示

**解决方案**：
```javascript
// 问题代码
pinBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  LinkManager.togglePin(link.id);  // 未 await
});

// 正确代码
pinBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  try {
    const result = await LinkManager.togglePin(link.id);
    if (result.success) {
      Toast.success(result.data.pinned ? '已置顶' : '已取消置顶');
    } else {
      Toast.error(result.errors?.[0] || '操作失败');
    }
  } catch (e) {
    Toast.error('操作失败: ' + e.message);
  }
});
```

### 6.7 浏览器缓存干扰

**现象**：修改代码后页面仍加载旧版本

**解决方案**：
```html
<!-- 给脚本添加版本号参数 -->
<script src="js/app.js?v=4"></script>
```

### 6.8 Redis 响应缓存键全为 anonymous（中间件执行顺序问题）

**现象**：登录用户的 GET 请求返回空数据，后端日志显示 `[Cache] 命中: studyhub:response:anonymous:/api/v1/links`，所有用户共享同一份空缓存。

**根本原因**：
- `backend/src/index.ts` 中，`cache` 中间件注册在 `authenticate` 中间件**之前**
- 缓存中间件在生成缓存键时读取 `req.user?.userId`，此时 `req.user` 尚未被赋值
- 所有请求的缓存键均降级为 `anonymous`，导致全员共享同一份缓存数据

```typescript
// ❌ 错误顺序（cache 先于 authenticate）
app.use('/api/v1/links', apiRateLimiter, linksCache, linksRouter);

// ✅ 正确顺序（authenticate 必须在 cache 之前）
app.use('/api/v1/links', apiRateLimiter, authenticate, linksCache, linksRouter);
```

**修复步骤**：
```typescript
// backend/src/index.ts
import { authenticate } from './middleware/auth.js';

app.use('/api/v1/categories', apiRateLimiter, authenticate, categoriesCache, categoriesRouter);
app.use('/api/v1/links',      apiRateLimiter, authenticate, linksCache,      linksRouter);
app.use('/api/v1/tasks',      apiRateLimiter, authenticate, tasksCache,      tasksRouter);
```

**经验教训**：
- Express 中间件的执行是严格按注册顺序的，依赖上游中间件设置的 `req.xxx` 值时，必须保证上游先执行
- 缓存中间件的缓存键生成逻辑依赖认证信息时，认证中间件**必须**在缓存中间件之前注册

---

### 6.9 写操作后 Redis 响应缓存未失效（脏读问题）

**现象**：
- 创建链接后立即查询，仍返回旧数据（5 分钟 TTL 内）
- 删除链接后再创建相同 URL，提示"该链接已存在"，但页面列表中不显示该链接

**根本原因**：
- 后端对 GET 请求的响应做了 Redis 缓存（TTL 5 分钟）
- POST/PUT/DELETE 等写操作执行后，对应用户的 GET 缓存**没有被主动清除**
- 前端内存缓存（`ApiStorageAdapter.cache`）显示新数据，但下次同步时从 Redis 拿到旧数据

**修复步骤**：
```typescript
// backend/src/utils/cache.ts 中已有 clearResponseCache 工具函数
export async function clearResponseCache(userId: string): Promise<void> {
  // 删除该用户所有 GET 响应缓存
}

// 在所有写操作路由中调用（以 links.ts 为例）
import { clearResponseCache } from '../middleware/cache.js';

// POST 创建链接后
router.post('/', authenticate, async (req, res) => {
  // ... 创建逻辑 ...
  clearResponseCache(userId).catch(err => console.error('[Links] 清除缓存失败:', err));
  res.json({ success: true, data: newLink });
});

// 同理：PUT 更新、DELETE 删除、PATCH 置顶均需清除缓存
```

**影响文件**：`backend/src/routes/links.ts`、`tasks.ts`、`categories.ts`

**经验教训**：
- 引入响应级缓存后，**写操作必须同步清除对应用户的缓存**，否则产生脏读
- 清除缓存的调用应放在成功响应**之前**（或 fire-and-forget 不阻塞响应），避免缓存清除失败影响主流程

---

### 6.10 同步接口 Promise.all 导致全部失败

**现象**：`tasks` 接口暂时不可用时，整体同步返回 `result.success = false`，前端不渲染任何数据（links、categories 也不显示）。

**根本原因**：
```javascript
// ApiStorageAdapter.sync() 中使用 Promise.all
const [links, categories, tasks] = await Promise.all([
    fetchLinks(),
    fetchCategories(),
    fetchTasks()  // 任意一个失败 → 整体抛出异常
]);
// tasks 失败 → catch → return false → reload() 不执行 → 页面空白
```

**修复步骤**：
```javascript
// 改用 Promise.allSettled，支持部分成功降级
const [linksResult, categoriesResult, tasksResult] = await Promise.allSettled([
    fetchLinks(),
    fetchCategories(),
    fetchTasks()
]);

const links      = linksResult.status      === 'fulfilled' ? linksResult.value      : [];
const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
const tasks      = tasksResult.status      === 'fulfilled' ? tasksResult.value      : [];

// 只要核心数据（links）同步成功即视为成功
if (linksResult.status === 'rejected') {
    throw linksResult.reason;
}
// tasks/categories 失败仅打印警告，不阻断流程
if (tasksResult.status === 'rejected') {
    console.warn('[ApiStorage] tasks 同步失败（降级为空）:', tasksResult.reason);
}
```

**经验教训**：
- 多接口并行请求时，优先使用 `Promise.allSettled` 而非 `Promise.all`
- 区分"核心数据"和"辅助数据"，核心数据失败才真正失败，辅助数据失败降级处理

---

### 6.11 API 模式下本地重复 URL 校验使用脏缓存

**现象**：
- 创建链接 A → 删除链接 A → 再次创建相同 URL → 前端报"该链接已存在"
- 实际上服务器已删除，只是前端内存缓存（`LinkManager.links`）中还有旧记录

**根本原因**：
```javascript
// linkManager.js validateLink() 中
const existingLink = links.find(l => l.url === link.url && l.id !== link.id);
if (existingLink) {
    errors.push('该链接已存在');  // 此处 links 是内存缓存，可能是脏数据
}
```

API 模式下，本地内存缓存与服务器状态之间存在时间窗口差，不应用本地缓存做业务校验。

**修复步骤**：
```javascript
// API 模式跳过本地重复 URL 校验，由服务器权威判断
if (!Storage.isApiMode()) {
    const existingLink = links.find(l => l.url === link.url && l.id !== link.id);
    if (existingLink) {
        errors.push('该链接已存在');
    }
}
// API 模式下，后端数据库的唯一约束将返回 409 Conflict
```

**经验教训**：
- API 模式下，前端内存缓存只作为展示用途，**不应用于业务校验**（数据新鲜度无法保证）
- 唯一性约束等校验应下沉到服务端，前端校验只做格式/长度等无状态校验

---

### 6.12 已登录用户刷新页面后数据不显示

**现象**：PC 端或手机端刷新页面后，虽处于登录状态但页面空白，无链接和任务数据。

**根本原因**（多层叠加）：

1. **`frontend/index.html` 缺少 `Storage.init()` 调用**
   - `DOMContentLoaded` 回调为同步函数，未 `await Storage.init()`
   - Storage 未完成初始化就进行后续操作，导致数据同步被跳过

2. **缺少已登录用户的自动渲染逻辑**
   - 页面加载时没有检测"已登录且处于 API 模式"的情况
   - 只在登录事件触发时渲染，刷新后不触发登录事件

3. **`auth.js` 登录后未显式调用 `App.renderLinks/Tasks`**
   - `handleLogin` 只调用了 `LinkManager.reload()` 和 `TaskManager.reload()`
   - 但 `notifyListeners()` 在某些时序下未能触发渲染

**修复步骤**：

```javascript
// frontend/index.html - DOMContentLoaded 改为 async
document.addEventListener('DOMContentLoaded', async () => {
    // 1. 必须最先初始化存储（await！）
    await Storage.init();

    // 2. 绑定按钮等 UI 事件...

    // 3. 如果已登录且处于 API 模式，主动触发渲染
    if (typeof Auth !== 'undefined' && Auth.isAuthenticated()) {
        if (Storage.getMode() === 'api') {
            LinkManager.reload();
            TaskManager.reload();
            App.renderLinks();
            App.renderTasks();
        }
    }
});
```

```javascript
// frontend/src/js/modules/auth.js - 登录成功后显式渲染
if (result.success) {
    if (typeof TaskManager !== 'undefined' && TaskManager.reload) {
        TaskManager.reload();
    }
    if (typeof LinkManager !== 'undefined' && LinkManager.reload) {
        LinkManager.reload();
    }
    // 显式触发渲染，防止 notifyListeners 时序问题
    if (typeof App !== 'undefined') {
        App.renderLinks();
        App.renderTasks();
    }
}
```

**经验教训**：
- `DOMContentLoaded` 回调只要内部有 `await`，就**必须**声明为 `async`
- 渲染触发需要覆盖三个入口：**登录时**、**页面刷新（已登录）**、**登出后重新登录**
- 参见 4.1 节的"正确的初始化顺序"

---

## 七、开发规范与最佳实践

### 7.1 数据操作规范

```javascript
// ✅ 正确：所有数据操作通过 Storage 层
async function addLink(linkData) {
  const result = await Storage.addLink(linkData);
  if (result.success) {
    // 更新 UI
  }
}

// ❌ 错误：直接操作本地数据
function addLink(linkData) {
  links.push(linkData);  // 绕过 Storage 层
  localStorage.setItem('links', JSON.stringify(links));
}
```

### 7.2 异步操作规范

```javascript
// ✅ 正确：使用 async/await 和 try-catch
async function handleOperation() {
  try {
    const result = await Storage.someOperation();
    if (result.success) {
      Toast.success('操作成功');
    } else {
      Toast.error(result.errors?.[0] || '操作失败');
    }
  } catch (e) {
    Toast.error('操作失败: ' + e.message);
  }
}

// ❌ 错误：未处理异步结果
function handleOperation() {
  Storage.someOperation();  // 未 await，结果未知
  Toast.success('操作成功'); // 可能实际失败了
}
```

### 7.3 模块初始化规范

```javascript
// ✅ 正确：延迟初始化，显式调用
const MyModule = (function() {
  let data = null;
  
  function loadData() {
    data = Storage.get('key', []);
  }
  
  return {
    init() {
      loadData();
    },
    reload() {
      loadData();
      notifyListeners();
    }
  };
})();

// 在 DOMContentLoaded 中初始化
await Storage.init();
MyModule.init();

// ❌ 错误：模块加载时立即初始化
const MyModule = (function() {
  const data = Storage.get('key', []);  // 时序问题！
  // ...
})();
```

### 7.4 调试日志规范

```javascript
// 统一的日志格式，便于搜索和过滤
console.log('[Storage] 初始化适配器, backendSync:', backendSync);
console.log('[ApiStorage] 发起请求:', url, 'Token:', token ? '有' : '无');
console.log('[LinkManager] 重新加载数据...');
console.error('[Auth] 监听器错误:', e);
```

### 7.5 新增数据模块检查清单

当新增数据模块（如 `NoteManager`）时，需检查以下入口点：

| 入口点 | 检查项 | 代码示例 |
|--------|--------|----------|
| 登录成功 | 是否调用 `reload()` + `render()` | `NoteManager.reload(); App.renderNotes();` |
| 登出成功 | 是否切换本地模式 + 重新加载 | `Storage.switchMode('local'); NoteManager.reload();` |
| 页面刷新（已登录） | 是否在 `Storage.init()` 后重新加载 | `if (Storage.getMode() === 'api') { NoteManager.reload(); }` |
| 模式切换 | 是否同步所有相关模块的数据 | `Storage.switchMode('api').then(() => NoteManager.reload())` |
| CRUD 操作 | 是否通过 Storage 层统一处理 | `Storage.addNote()`, `Storage.updateNote()` 等 |

### 7.6 后端响应缓存设计规范

引入 Redis 响应级缓存时，必须同时处理缓存失效，否则会产生脏读。

**中间件注册顺序（强制要求）**：

```typescript
// ✅ 正确：认证 → 缓存 → 路由处理器
app.use('/api/v1/links', apiRateLimiter, authenticate, linksCache, linksRouter);

// ❌ 错误：缓存在认证之前，req.user 未初始化
app.use('/api/v1/links', apiRateLimiter, linksCache, linksRouter);
```

**写操作必须清除缓存（强制要求）**：

```typescript
// 每个写操作路由（POST/PUT/DELETE/PATCH）末尾均须清除该用户的响应缓存
import { clearResponseCache } from '../middleware/cache.js';

router.post('/', authenticate, async (req, res) => {
    const userId = req.user!.userId;
    // ... 写操作逻辑 ...
    
    // 清除缓存（非阻塞，不影响响应速度）
    clearResponseCache(userId).catch(err => console.error('[Cache] 清除失败:', err));
    
    res.json({ success: true, data: result });
});
```

**后端响应缓存检查清单**：

| 检查项 | 说明 |
|--------|------|
| `authenticate` 在 `cache` 之前 | 确保缓存键包含正确的 userId |
| POST 写操作后清缓存 | 防止新增数据在 TTL 内不可见 |
| PUT 写操作后清缓存 | 防止更新数据在 TTL 内不可见 |
| DELETE 写操作后清缓存 | 防止已删数据仍出现在缓存中 |
| PATCH 写操作后清缓存 | 批量操作同理 |

---

## 八、问题排查指南

### 8.1 数据不显示排查流程

当遇到「数据不显示」时，按以下顺序排查：

```
1. 后端数据
   └─► API 是否正常返回数据？（检查 Network 面板）
   
2. 格式转换
   └─► 适配器是否正确转换字段名？（检查 ApiStorageAdapter）
   
3. 缓存同步
   └─► ApiStorageAdapter.cache 是否已更新？（console.log 检查）
   
4. 模块数据
   └─► TaskManager.tasks / LinkManager.links 是否已更新？
   
5. UI 渲染
   └─► 是否调用了 App.renderXxx()？
   
6. 入口覆盖
   └─► 登录/登出/刷新时是否都触发了数据同步？
```

### 8.2 常见错误及解决

| 错误现象 | 可能原因 | 解决方案 |
|----------|----------|----------|
| `LinkManager is not defined` | 脚本加载顺序错误 | 检查 index.html 中脚本加载顺序 |
| 登录后数据为空 | 未调用 `reload()` | 在登录回调中添加 `XxxManager.reload()` |
| 数据修改后不同步 | 直接操作本地数据 | 确保通过 `Storage.xxx()` 方法操作 |
| 页面刷新后数据丢失 | 未持久化到存储 | 检查 `saveData()` 是否被调用 |
| API 请求 401 | Token 过期 | 检查 Token 刷新逻辑 |
| 异步操作无响应 | 未使用 await | 添加 async/await |

### 8.3 调试技巧

```javascript
// 1. 检查当前存储模式
console.log('当前模式:', Storage.getMode());

// 2. 检查缓存数据（API 模式）
console.log('API 缓存:', ApiStorageAdapter.get('links'));

// 3. 检查模块数据
console.log('LinkManager 数据:', LinkManager.getAll());
console.log('TaskManager 数据:', TaskManager.getAll());

// 4. 检查 localStorage
console.log('localStorage links:', localStorage.getItem('studyhub_links'));

// 5. 检查登录状态
console.log('是否已登录:', ApiClient.isAuthenticated());
console.log('用户信息:', ApiClient.getUser());
```

---

## 九、后续改进方向

### 9.1 技术债务

1. **引入 TypeScript**
   - 增加类型检查，减少参数传递错误
   - 明确前后端数据契约

2. **单元测试**
   - 为核心模块（Storage、LinkManager、TaskManager）添加测试
   - 防止回归问题

3. **构建工具**
   - 使用 Vite/Webpack 自动处理缓存和模块打包
   - 生产环境自动添加版本号

4. **错误监控**
   - 添加全局错误捕获和上报机制
   - 集成 Sentry 等监控服务

### 9.2 功能增强

1. **数据同步自动化**
   - 设计统一的数据同步机制，避免遗漏模块
   - 自动检测数据变更并同步

2. **离线支持**
   - 实现 Service Worker 缓存
   - 支持离线读写，联网后自动同步

3. **数据迁移工具**
   - 版本升级时自动迁移数据格式
   - 支持导入/导出更多格式（CSV、Markdown 等）

4. **接口契约测试**
   - 确保前后端数据格式转换的正确性
   - 自动化 API 契约测试

---

## 附录：关键代码片段

### A.1 完整的登录流程处理

```javascript
// index.html 中的登录状态处理
Auth.subscribe(async (event, data) => {
  if (event === 'login' || event === 'register') {
    // 隐藏登录/注册按钮
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    syncBtn.style.display = '';
    
    // 切换到云端模式并同步数据
    const result = await Storage.switchMode('api');
    
    if (result.success) {
      Toast.show('已切换到云端同步模式', 'success');
      
      // 重新加载所有数据并渲染
      LinkManager.reload();
      TaskManager.reload();
      App.renderLinks();
      App.renderTasks();
    }
  } else if (event === 'logout') {
    // 显示登录/注册按钮
    loginBtn.style.display = '';
    registerBtn.style.display = '';
    syncBtn.style.display = 'none';
    
    // 切换到本地模式
    await Storage.switchMode('local');
    
    // 重新加载本地数据
    LinkManager.reload();
    TaskManager.reload();
    App.renderLinks();
    App.renderTasks();
  }
});
```

### A.2 数据操作统一封装

```javascript
// Storage 层的数据操作方法
const api = {
  // 链接操作
  async addLink(linkData) {
    if (currentMode === 'api' && currentAdapter.addLink) {
      return currentAdapter.addLink(linkData);
    }
    return LinkManager.add(linkData);
  },
  
  async updateLink(id, updates) {
    if (currentMode === 'api' && currentAdapter.updateLink) {
      return currentAdapter.updateLink(id, updates);
    }
    return LinkManager.update(id, updates);
  },
  
  async deleteLink(id) {
    if (currentMode === 'api' && currentAdapter.deleteLink) {
      return currentAdapter.deleteLink(id);
    }
    return LinkManager.delete(id);
  },
  
  // 任务操作
  async addTask(taskData) {
    if (currentMode === 'api' && currentAdapter.addTask) {
      return currentAdapter.addTask(taskData);
    }
    return TaskManager.add(taskData);
  },
  
  async updateTask(id, updates) {
    if (currentMode === 'api' && currentAdapter.updateTask) {
      return currentAdapter.updateTask(id, updates);
    }
    return TaskManager.update(id, updates);
  },
  
  async deleteTask(id) {
    if (currentMode === 'api' && currentAdapter.deleteTask) {
      return currentAdapter.deleteTask(id);
    }
    return TaskManager.delete(id);
  }
};
```

---

*最后更新：2026-03-25（完整重构版 + 跨端同步问题修复补充）*

---

# 附录 B：StudyHub 阿里云服务器部署技术问题汇总

> 本文档记录了 StudyHub v1.4.0 部署到阿里云 ECS 服务器（Alibaba Cloud Linux 3, 4核8G, 公网IP 121.199.45.201）过程中遇到的所有技术问题及解决方案。

---

## 目录

1. [环境配置问题](#b1-环境配置问题)
2. [Docker 构建错误](#b2-docker-构建错误)
3. [数据库连接故障](#b3-数据库连接故障)
4. [CORS 跨域配置](#b4-cors-跨域配置)
5. [Redis 密码配置](#b5-redis-密码配置)
6. [前端后端通信问题](#b6-前端后端通信问题)
7. [部署配置问题](#b7-部署配置问题)
8. [经验总结与最佳实践](#b8-经验总结与最佳实践)

---

## B.1 环境配置问题

### B.1.1 Docker Compose 命令不存在

**问题现象**
```bash
$ docker-compose up -d
-bash: docker-compose: command not found
```

**根本原因**
- 新版 Docker 已将 Compose 功能集成到 Docker CLI 中
- 旧版 `docker-compose` 命令不再作为独立工具提供

**解决步骤**
```bash
# 使用新版 Docker 内置命令（空格而非横杠）
docker compose up -d

# 查看版本
docker compose version
```

**最终效果**
- Docker Compose 命令正常执行
- 服务成功启动

---

### B.1.2 Docker 镜像拉取超时

**问题现象**
```
Error response from daemon: Get "https://registry-1.docker.io/v2/": 
net/http: request canceled while waiting for connection
```

**根本原因**
- 国内网络访问 Docker Hub 官方仓库超时
- 默认镜像源在国外，连接不稳定

**解决步骤**
```bash
# 1. 创建 Docker 配置文件
sudo mkdir -p /etc/docker

# 2. 配置国内镜像源
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
EOF

# 3. 重启 Docker 服务
sudo systemctl daemon-reload
sudo systemctl restart docker
```

**最终效果**
- 镜像拉取速度显著提升
- PostgreSQL、Redis、Node.js 等镜像成功下载

---

### B.1.3 Alpine Linux 软件源极慢

**问题现象**
```
 => [backend 2/6] RUN apk add --no-cache python3 make g++
 => => # fetch https://dl-cdn.alpinelinux.org/alpine/v3.19/main/x86_64/APKINDEX.tar.gz
 # 耗时 48 分钟仍未完成
```

**根本原因**
- Alpine Linux 默认使用国外软件源 `dl-cdn.alpinelinux.org`
- 国内访问速度慢，导致构建时间极长

**解决步骤**
```dockerfile
# 在 backend/Dockerfile 中添加
FROM node:18-alpine

# 更换 Alpine 软件源为国内镜像
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 然后再安装依赖
RUN apk add --no-cache python3 make g++
```

**最终效果**
- 软件包安装时间从 48 分钟缩短到 30 秒
- Docker 镜像构建速度显著提升

---

## B.2 Docker 构建错误

### B.2.1 npm ci 需要 package-lock.json

**问题现象**
```
 => [backend 4/6] RUN npm ci --only=production
 => => # npm ERR! The `npm ci` command can only install with an existing package-lock.json
 => => # npm ERR! If you need a new lock file, use npm install instead
```

**根本原因**
- `npm ci` 命令需要 `package-lock.json` 文件来精确安装依赖版本
- 项目代码中未提交该文件

**解决步骤**
```dockerfile
# 修改 backend/Dockerfile
# 原代码：
# RUN npm ci --only=production

# 改为使用 npm install
RUN npm install --omit=dev && \
    npm cache clean --force
```

**最终效果**
- Docker 镜像构建成功
- 生产依赖正确安装

---

### B.2.2 TypeScript 编译错误 - import.meta 不支持

**问题现象**
```
src/routes/swagger.ts:10:25 - error TS1470: 
The 'import.meta' meta-property is not allowed in files 
which will build into CommonJS output.

10 const __dirname = dirname(fileURLToPath(import.meta.url));
```

**根本原因**
- TypeScript 配置输出 CommonJS 格式
- `import.meta` 是 ES Module 特性，在 CommonJS 中不支持
- `__dirname` 在 ES Module 中不可用

**解决步骤**
```typescript
// 修改 backend/src/routes/swagger.ts
// 移除 ES Module 特有的 import.meta

// 原代码：
// import { fileURLToPath } from 'url';
// const __dirname = dirname(fileURLToPath(import.meta.url));
// const openApiPath = join(__dirname, 'openapi.json');

// 改为使用 process.cwd()
import { join } from 'path';
const openApiPath = join(process.cwd(), 'src', 'routes', 'openapi.json');
```

**最终效果**
- TypeScript 编译成功
- Swagger 文档正常加载

---

### B.2.3 前端 Dockerfile 路径错误

**问题现象**
```
 => [frontend 3/4] COPY nginx.conf /etc/nginx/conf.d/default.conf
 => => # COPY failed: file not found: /nginx.conf
```

**根本原因**
- Docker 构建上下文是项目根目录
- COPY 指令中的路径缺少 `frontend/` 前缀

**解决步骤**
```dockerfile
# 修改 frontend/Dockerfile
# 原代码：
# COPY nginx.conf /etc/nginx/conf.d/default.conf
# COPY index.html /usr/share/nginx/html/
# COPY src /usr/share/nginx/html/src/

# 改为：
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend/index.html /usr/share/nginx/html/
COPY frontend/src /usr/share/nginx/html/src/
```

**最终效果**
- 前端 Docker 镜像构建成功
- Nginx 配置和静态资源正确复制

---

## B.3 数据库连接故障

### B.3.1 数据库迁移工具未安装

**问题现象**
```bash
$ docker-compose exec backend npm run migrate
> node-pg-migrate up
sh: node-pg-migrate: not found
```

**根本原因**
- `node-pg-migrate` 是开发依赖，生产环境未安装
- 容器内没有可用的数据库迁移工具

**解决步骤**
```bash
# 方案 1：在宿主机安装 Node.js 执行迁移
# 1. 安装 Node.js 18
sudo yum install -y nodejs npm

# 2. 安装迁移工具
npm install -g node-pg-migrate pg

# 3. 执行迁移
DATABASE_URL=postgresql://studyhub:密码@localhost:5432/studyhub \
  node-pg-migrate up

# 方案 2：直接执行 SQL 初始化脚本
# 使用 psql 连接数据库并执行建表语句
```

**最终效果**
- 数据库表结构成功创建
- 迁移完成，应用可以正常访问数据库

---

## B.4 CORS 跨域配置

### B.4.1 后端 CORS 白名单配置错误

**问题现象**
```
Access to fetch at 'http://121.199.45.201:3000/api/v1/auth/login' 
from origin 'http://121.199.45.201:8080' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
The 'Access-Control-Allow-Origin' header has a value 'http://localhost:8080' 
that is not equal to the supplied origin.
```

**根本原因**
- `docker-compose.yml` 中硬编码了 `FRONTEND_URL: http://localhost:8080`
- 该配置覆盖了 `.env.docker` 中的环境变量
- 后端返回的 CORS 头与前端实际来源不匹配

**解决步骤**
```yaml
# 修改 docker-compose.yml
services:
  backend:
    environment:
      # 原配置：
      # FRONTEND_URL: http://localhost:8080
      
      # 改为使用环境变量或正确的公网 IP
      FRONTEND_URL: http://121.199.45.201:8080
```

**验证方法**
```bash
# 检查后端容器环境变量
docker exec studyhub-backend env | grep FRONTEND
# 应输出：FRONTEND_URL=http://121.199.45.201:8080

# 检查响应头
curl -I http://121.199.45.201:3000/api/health
# 应包含：Access-Control-Allow-Origin: http://121.199.45.201:8080
```

**最终效果**
- CORS 跨域问题完全解决
- 前端可以正常调用后端 API

---

### B.4.2 前端 API 地址硬编码为 localhost

**问题现象**
```
GET http://localhost:3000/api/v1/auth/login net::ERR_CONNECTION_REFUSED
```

**根本原因**
- 前端代码中 API 基础地址硬编码为 `http://localhost:3000`
- 浏览器中 `localhost` 指向用户本地电脑，不是服务器

**解决步骤**
```bash
# 在服务器上修改前端文件
ssh root@121.199.45.201
cd /opt/StudyHub/frontend/src/js/modules

# 批量替换 localhost 为服务器 IP
sed -i 's/localhost:3000/121.199.45.201:3000/g' \
  api.js storage/ApiStorageAdapter.js migration.js config.js
```

**修改的文件清单**
| 文件 | 修改内容 |
|------|----------|
| `api.js` | `API_BASE_URL`, `AUTH_BASE_URL` |
| `storage/ApiStorageAdapter.js` | `API_BASE_URL` |
| `migration.js` | `API_BASE_URL` |
| `config.js` | `backendUrl` |

**最终效果**
- 前端正确指向服务器后端 API
- 请求成功发送到 `121.199.45.201:3000`

---

### B.4.3 CORS 报错实为后端接口崩溃

**问题现象**
```
Access to fetch at 'http://121.199.45.201:3000/api/v1/tasks' 
from origin 'http://121.199.45.201:8080' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```
同时，`/api/v1/links` 和 `/api/v1/categories` 无 CORS 问题，只有 `/api/v1/tasks` 报错。

**根本原因**
- PostgreSQL 数据库容器（`postgres` 服务）未运行
- `tasks` 接口依赖数据库查询，数据库连接失败导致后端**内部崩溃**，未返回任何响应
- 无响应 = 无 CORS 响应头 = 浏览器报 CORS 错误
- `links`/`categories` 因命中 Redis 缓存（`anonymous` 键）正常返回，故无 CORS 报错

**诊断方法**
```bash
# 1. 检查容器状态（确认 postgres 是否运行）
docker compose ps

# 2. 直接 curl 测试，绕过浏览器 CORS 检查
curl -H "Authorization: Bearer <token>" \
  http://121.199.45.201:3000/api/v1/tasks

# 3. 查看后端日志
docker compose logs backend --tail=50
# 若看到数据库连接错误，则是 DB 问题而非 CORS
```

**解决步骤**
```bash
# 启动数据库服务（注意：服务名是 postgres，不是 db）
docker compose up -d postgres

# 重启后端（确保重新连接数据库）
docker compose restart backend
```

**经验教训**
- **遇到 CORS 报错，第一反应不是看 CORS 配置，而是看后端日志**
- 只有部分接口 CORS 报错时，优先排查那些接口是否有异常（DB/Redis 依赖）
- `links`/`categories` 命中缓存不报错，`tasks` 走 DB 报错，是诊断 DB 故障的有力线索

---

## B.5 Redis 密码配置

### B.5.1 Redis requirepass 特殊字符解析失败

**问题现象**
```
# Redis 日志
1:M 25 Mar 2026 05:30:12.123 # Fatal error, can't open config file 
1:M 25 Mar 2026 05:30:12.124 # Wrong number of arguments for 'requirepass' command
```

**根本原因**
- Redis 密码包含特殊字符 `/` 和 `+`
- 这些字符在 Redis 配置文件中被错误解析
- 密码格式：`abc/def+123` 导致配置解析失败

**解决步骤**
```bash
# 方案 1：修改密码，移除特殊字符
# 在 .env.docker 中设置简单密码
REDIS_PASSWORD=yourpassword123

# 方案 2：使用无密码模式（内网环境推荐）
# 修改 docker-compose.yml，移除 requirepass 配置
redis:
  command: redis-server --appendonly yes
  # 移除：--requirepass ${REDIS_PASSWORD}
```

**最终效果**
- Redis 服务正常启动
- 后端可以正常连接 Redis

---

## B.6 前端后端通信问题

### B.6.1 前端资源 502 Bad Gateway

**问题现象**
```
GET http://121.199.45.201:8080/src/js/modules/errorHandler.js 
net::ERR_ABORTED 502 (Bad Gateway)
```

**根本原因**
- 浏览器缓存了旧的错误页面
- 前端容器健康检查失败但实际运行正常

**解决步骤**
```bash
# 1. 强制刷新浏览器（Ctrl + F5）
# 2. 或使用无痕模式访问
# 3. 清除浏览器缓存

# 验证前端容器状态
docker compose ps frontend
# 状态可能显示 unhealthy，但实际可以访问
```

**最终效果**
- 前端资源正常加载
- 应用界面正常显示

---

### B.6.2 用户注册 400 Bad Request

**问题现象**
```
POST http://121.199.45.201:3000/api/v1/auth/register 400 (Bad Request)
```

**根本原因**
- 后端密码验证要求严格：
  - 至少 8 个字符
  - 必须包含小写字母
  - 必须包含大写字母
  - 必须包含数字
  - 不能太简单（如 password, 12345678）

**解决步骤**
```bash
# 使用符合要求的密码
# ✅ 正确的密码示例：
MyPass123
StudyHub2024
YourPassword1

# ❌ 错误的密码示例：
password      # 太简单
12345678      # 太简单
abc123        # 缺少大写字母
```

**最终效果**
- 用户注册成功
- 可以正常登录使用

---

### B.6.3 移动端浏览器缓存旧版 index.html 导致新代码不生效

**问题现象**
- 服务器重新部署了修复版代码（含 `Storage.init()` 等关键修复）
- PC 端强制刷新后正常，但手机 Edge 浏览器仍运行旧逻辑
- 手机端清除浏览器缓存后，问题立即消失，数据正常显示

**根本原因**
- `nginx.conf` 对 `/` 路由仅配置了 `Cache-Control: no-cache`
- `no-cache` 含义：使用前需向服务器验证，但**并不禁止缓存**
- 移动端浏览器（尤其是弱网状态）可能跳过验证直接使用本地缓存
- 旧版 `index.html` 缺少关键初始化代码，被持续使用

**`no-cache` vs `no-store` 区别**：

| 指令 | 行为 | 适用场景 |
|------|------|----------|
| `no-cache` | 缓存但每次使用前须向服务器验证 | 有版本控制的静态资源 |
| `no-store` | 完全禁止缓存，每次必须重新下载 | HTML 入口文件 |
| `must-revalidate` | 缓存过期后必须重新验证 | 配合 max-age 使用 |

**解决步骤**：
```nginx
# frontend/nginx.conf
# 修改前：
location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache";
}

# 修改后：彻底禁止 HTML 文件缓存
location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}
```

**JS/CSS 保持长期缓存不变**（文件名带 hash/版本号时内容变化文件名也变）：
```nginx
location ~* \.(js|css|png|jpg|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**最终效果**
- 任何浏览器（包括移动端）每次访问都从服务器获取最新 `index.html`
- 部署新版本后无需用户手动清除缓存

---

## B.7 部署配置问题

### B.7.1 环境变量优先级问题

**问题现象**
- 修改了 `.env.docker` 中的配置
- 重启容器后配置未生效
- 后端仍使用旧配置

**根本原因**
- `docker-compose.yml` 中硬编码的环境变量优先级高于 `.env.docker`
- 需要同时修改 `docker-compose.yml` 中的配置

**解决步骤**
```yaml
# docker-compose.yml 配置优先级（从高到低）：
# 1. docker-compose.yml 中直接定义的环境变量
# 2. .env.docker 文件中的变量
# 3. 系统环境变量

# 最佳实践：
# - 敏感信息使用 .env.docker
# - 固定配置直接写在 docker-compose.yml
# - 确保两者一致
```

**配置检查清单**
| 配置项 | .env.docker | docker-compose.yml | 说明 |
|--------|-------------|-------------------|------|
| FRONTEND_URL | ✅ | ✅ | 两者必须一致 |
| DB_PASSWORD | ✅ | ❌ | 只在 .env.docker |
| JWT_SECRET | ✅ | ❌ | 只在 .env.docker |
| REDIS_PASSWORD | ✅ | ❌ | 只在 .env.docker |

---

### B.7.2 Docker 服务名混淆（exec db vs exec postgres）

**问题现象**
```bash
$ docker compose exec db psql -U postgres
no such service: db
```

**根本原因**
- `docker-compose.yml` 中数据库服务名定义为 `postgres`，而非 `db`
- 操作时习惯性使用 `db` 作为服务名，导致命令失败

**解决步骤**
```bash
# ❌ 错误：使用了不存在的服务名
docker compose exec db psql -U postgres

# ✅ 正确：查看实际服务名
docker compose ps
# 输出中看到：studyhub-postgres-1

# ✅ 使用正确的服务名
docker compose exec postgres psql -U postgres -d studyhub
```

**快速记忆规则**：
- 服务名在 `docker-compose.yml` 的顶层 `services:` 下定义
- 容器名 = `项目名-服务名-序号`（如 `studyhub-postgres-1`）
- 操作容器时用**服务名**（`docker compose exec <服务名>`），不是容器名

**建议**：在 `docker-compose.yml` 中添加注释标记服务名：
```yaml
services:
  postgres:   # ← 数据库服务名（exec 时用这个）
    image: postgres:15-alpine
    ...
  backend:    # ← 后端服务名
    ...
```

---

## B.8 经验总结与最佳实践

### B.8.1 部署前检查清单

```markdown
- [ ] 服务器配置：4核8G 或更高
- [ ] 操作系统：Alibaba Cloud Linux 3 / CentOS 8 / Ubuntu 20.04+
- [ ] Docker 版本：20.10.0+
- [ ] Docker Compose：v2.0.0+
- [ ] 安全组端口：80, 443, 3000, 8080, 5432, 6379
- [ ] 域名或公网 IP 已配置
```

### B.8.2 部署步骤总结

```bash
# 1. 服务器环境准备
sudo yum update -y
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker

# 2. 配置 Docker 国内镜像
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
EOF
sudo systemctl restart docker

# 3. 上传项目代码
git clone <your-repo> /opt/StudyHub
cd /opt/StudyHub

# 4. 配置环境变量
cp .env.docker.example .env.docker
# 编辑 .env.docker，设置数据库密码、JWT 密钥等

# 5. 修改 docker-compose.yml
# - 更新 FRONTEND_URL 为公网 IP
# - 检查端口映射

# 6. 修改前端 API 地址
sed -i 's/localhost:3000/<你的IP>:3000/g' \
  frontend/src/js/modules/api.js \
  frontend/src/js/modules/config.js

# 7. 构建并启动服务
docker compose up -d --build

# 8. 初始化数据库
docker compose exec postgres psql -U postgres -c "CREATE DATABASE studyhub;"
# 执行数据库迁移

# 9. 验证部署
curl http://<你的IP>:3000/api/health
curl -I http://<你的IP>:8080
```

### B.8.3 常见问题速查

| 问题 | 快速解决 |
|------|----------|
| `docker-compose: command not found` | 使用 `docker compose`（空格） |
| 镜像拉取超时 | 配置国内 Docker 镜像源 |
| `npm ci` 失败 | 改为 `npm install --omit=dev` |
| TypeScript 编译错误 | 移除 `import.meta`，使用 `process.cwd()` |
| CORS 错误 | 先查后端日志确认是否崩溃，再看 `FRONTEND_URL` 配置 |
| Redis 启动失败 | 移除密码中的特殊字符 |
| 502 Bad Gateway | 强制刷新浏览器或清除缓存 |
| 注册 400 错误 | 使用符合要求的强密码 |
| 所有用户数据返回空（anonymous缓存） | 检查 `authenticate` 是否在 `cache` 中间件之前 |
| 写操作后数据不更新 | 在路由写操作后调用 `clearResponseCache(userId)` |
| 手机端登录后数据空白 | 检查 `nginx.conf` 是否配置 `no-store`，并确认 `index.html` 有 `await Storage.init()` |
| `docker compose exec db` 失败 | 用 `docker compose ps` 查实际服务名（通常是 `postgres`） |

### B.8.4 服务器信息

```yaml
服务器: 阿里云 ECS
操作系统: Alibaba Cloud Linux 3 (CentOS 兼容)
配置: 4核8G
公网 IP: 121.199.45.201
部署路径: /opt/StudyHub
访问地址:
  - 前端: http://121.199.45.201:8080
  - API: http://121.199.45.201:3000
```

---

*文档创建时间：2026-03-25*
*适用版本：StudyHub v1.4.0*
