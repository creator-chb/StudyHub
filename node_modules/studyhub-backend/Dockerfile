# =============================================
# StudyHub 后端服务 Dockerfile
# 多阶段构建：构建阶段 + 运行阶段
# =============================================

# ---------------------------------------------
# 阶段 1: 构建阶段
# ---------------------------------------------
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 更换 Alpine 软件源为国内镜像
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装构建依赖（某些 npm 包需要 Python 和 make）
RUN apk add --no-cache python3 make g++

# 复制依赖文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装所有依赖（包括开发依赖）
RUN npm install

# 复制源代码
COPY src ./src

# 编译 TypeScript
RUN npm run build

# ---------------------------------------------
# 阶段 2: 运行阶段
# ---------------------------------------------
FROM node:18-alpine AS runner

# 更换 Alpine 软件源为国内镜像
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装 dumb-init 用于正确处理信号
RUN apk add --no-cache dumb-init

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 复制生产依赖文件
COPY package*.json ./

# 只安装生产依赖
RUN npm install --omit=dev && \
    npm cache clean --force

# 从构建阶段复制编译后的代码
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]

# 启动命令
CMD ["node", "dist/index.js"]
