# =============================================
# StudyHub 前端服务 Dockerfile
# 使用 Nginx 提供静态资源服务
# =============================================

FROM nginx:1.25-alpine

# 创建非 root 用户
RUN addgroup -g 1001 -S nginx-group && \
    adduser -S nginx-user -u 1001 -G nginx-group

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制前端静态文件
# 注意：根目录的 index.html 是主应用入口
COPY index.html /usr/share/nginx/html/
COPY src /usr/share/nginx/html/src/

# 设置文件权限
RUN chown -R nginx-user:nginx-group /usr/share/nginx/html && \
    chown -R nginx-user:nginx-group /var/cache/nginx && \
    chown -R nginx-user:nginx-group /var/log/nginx && \
    chown -R nginx-user:nginx-group /etc/nginx/conf.d

# 创建必要的目录并设置权限
RUN touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-group /var/run/nginx.pid

# 切换到非 root 用户
USER nginx-user

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
