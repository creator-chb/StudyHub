# StudyHub - 学习智能体平台

一个基于浏览器的轻量级学习任务管理工具，帮助你高效管理学习链接和任务计划。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## 📖 项目简介

StudyHub 是一个前端单页应用，提供简洁直观的界面来管理学习资源链接和学习任务。无需后端服务器，所有数据本地存储，开箱即用。

### ✨ 主要特性

- 🔗 **链接池管理** - 快速添加、编辑、删除常用学习链接
- 📋 **任务管理** - 创建学习任务，设置截止时间，关联多个链接
- ⏰ **时间排序** - 任务按截止时间自动排序，一目了然
- 🚀 **一键跳转** - 批量打开任务相关的所有学习链接
- 💾 **本地存储** - 使用 localStorage 持久化数据，隐私安全
- 🎨 **现代 UI** - 简洁美观的卡片式设计，响应式布局

## 🚀 快速开始

### 方式一：直接使用

1. 下载 `studyhub.html` 文件
2. 用浏览器（推荐 Chrome/Edge）打开
3. 开始使用！

### 方式二：本地部署

```bash
# 克隆项目到本地
git clone https://github.com/your-username/StudyHub.git

# 进入项目目录
cd StudyHub

# 直接用浏览器打开 studyhub.html
# 或者启动本地服务器
python -m http.server 8080
```

然后在浏览器访问 `http://localhost:8080/studyhub.html`

## 📖 使用指南

### 1️⃣ 管理链接池

在"快速链接池"模块中：
- 输入链接名称和 URL
- 点击"添加链接"按钮
- 可点击已有链接快速跳转
- 支持编辑和删除操作

### 2️⃣ 创建任务

在"任务管理"模块中：
- 输入任务名称
- 选择截止日期和时间
- 从链接池勾选或手动输入相关链接
- 点击"创建任务"

### 3️⃣ 执行任务

- 查看按时间排序的任务列表
- 点击"一键跳转"批量打开所有学习链接
- 支持随时编辑或删除任务

## 🛠️ 技术栈

- **纯前端实现** - HTML5 + CSS3 + JavaScript
- **本地存储** - localStorage API
- **零依赖** - 无需任何第三方库
- **响应式设计** - 适配各种屏幕尺寸

## 📁 项目结构

```
StudyHub/
├── studyhub.html      # 主页面文件（包含所有 HTML、CSS、JS）
└── README.md          # 项目说明文档
```

## 🎯 功能树

```mermaid
graph TD
    A[StudyHub 学习平台] --> B[链接池管理]
    A --> C[任务管理]
    B --> B1[添加链接]
    B --> B2[编辑链接]
    B --> B3[删除链接]
    B --> B4[快速跳转]
    C --> C1[创建任务]
    C --> C2[编辑任务]
    C --> C3[删除任务]
    C --> C4[一键打开所有链接]
    C --> C5[按时间排序]
```

## 🔧 自定义配置

### 修改主题颜色

编辑 `studyhub.html` 中的 CSS 部分：

```css
/* 修改主色调 */
button {
    background: #4f8cff;  /* 改为你喜欢的颜色 */
}

/* 修改背景色 */
body {
    background: #f5f7fa;  /* 改为其他背景色 */
}
```

### 添加新功能

项目采用模块化设计，易于扩展：
- 在 `<style>` 标签中添加新样式
- 在 `<script>` 标签中添加新函数
- 在 `<body>` 中添加新的 HTML 元素

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🐛 问题反馈

如遇到问题，请前往 [Issues](https://github.com/your-username/StudyHub/issues) 页面反馈。

## 📬 联系方式

- 作者：chb
- Email: 2956529037@qq.com

## 🙏 致谢

感谢所有为本项目做出贡献的开发者！

---

**Enjoy Learning! 🎓**
