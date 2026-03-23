# StudyHub 部署文档

> 本文档详细说明 StudyHub 项目的部署流程、环境配置和运维管理。

---

## 目录

1. [环境要求](#环境要求)
2. [快速开始](#快速开始)
3. [开发环境部署](#开发环境部署)
4. [生产环境部署](#生产环境部署)
5. [配置说明](#配置说明)
6. [SSL 证书配置](#ssl-证书配置)
7. [备份与恢复](#备份与恢复)
8. [监控与日志](#监控与日志)
9. [故障排查](#故障排查)
10. [CI/CD 配置](#cicd-配置)

---

## 环境要求

### 服务器要求

| 组件 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 磁盘 | 20 GB | 50 GB SSD |
| 网络 | 10 Mbps | 100 Mbps |

### 软件要求

- **Docker**: 20.10.0 或更高版本
- **Docker Compose**: 2.0.0 或更高版本
- **Git**: 2.30.0 或更高版本
- **操作系统**: Linux (Ubuntu 20.04+ / CentOS 8+ / Debian 11+)

### 检查环境

```bash
# 检查 Docker
docker --version
docker-compose --version

# 检查端口占用
sudo netstat -tlnp | grep -E ':(80|443|3000|8080|5432|6379)'
```

---

## 快速开始

### 1. 克隆代码

```bash
git clone https://github.com/yourusername/studyhub.git
cd studyhub
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.docker.example .env.docker

# 编辑配置
nano .env.docker
```

### 3. 启动服务

```bash
# 开发环境
docker-compose up -d

# 生产环境
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 4. 验证部署

```bash
# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend

# 访问应用
# 前端: http://localhost:8080
# API: http://localhost:3000/api/health
```

---

## 开发环境部署

### 完整步骤

```bash
# 1. 进入项目目录
cd studyhub

# 2. 配置环境变量
cp .env.docker.example .env.docker
# 编辑 .env.docker，设置数据库密码和 JWT 密钥

# 3. 构建并启动服务
docker-compose up -d --build

# 4. 执行数据库迁移
docker-compose exec backend npm run migrate

# 5. 验证服务
curl http://localhost:3000/api/health
```

### 开发环境特性

- **热重载**: 后端代码修改后自动重启
- **端口映射**: 所有服务端口映射到宿主机
- **调试友好**: 日志输出详细，便于调试

---

## 生产环境部署

### 1. 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 部署应用

```bash
# 克隆代码
git clone https://github.com/yourusername/studyhub.git /opt/studyhub
cd /opt/studyhub

# 配置环境变量
cp .env.docker.example .env.docker
nano .env.docker

# 重要配置项：
# - NODE_ENV=production
# - JWT_SECRET=<使用强密码>
# - DB_PASSWORD=<使用强密码>
# - REDIS_PASSWORD=<使用强密码>

# 使用部署脚本
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 3. 配置 Nginx 和 SSL

```bash
# 配置 SSL 证书
export DOMAIN=your-domain.com
export ACME_EMAIL=your-email@example.com

# 初始化 SSL
chmod +x scripts/init-ssl.sh
./scripts/init-ssl.sh
```

### 4. 生产环境优化

```bash
# 启用所有生产优化
docker-compose -f docker-compose.yml \
               -f docker-compose.prod.yml \
               -f docker-compose.logging.yml \
               -f docker-compose.monitoring.yml \
               up -d
```

---

## 配置说明

### 环境变量详解

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `NODE_ENV` | 运行环境 | development | 是 |
| `FRONTEND_PORT` | 前端端口 | 8080 | 否 |
| `BACKEND_PORT` | 后端端口 | 3000 | 否 |
| `DB_USER` | 数据库用户 | postgres | 是 |
| `DB_PASSWORD` | 数据库密码 | - | 是 |
| `DB_NAME` | 数据库名 | studyhub | 是 |
| `REDIS_PASSWORD` | Redis 密码 | - | 建议 |
| `JWT_SECRET` | JWT 密钥 | - | 是 |
| `JWT_EXPIRES_IN` | Token 过期时间 | 7d | 否 |
| `JWT_REFRESH_EXPIRES_IN` | 刷新Token过期时间 | 30d | 否 |

### 生成安全密钥

```bash
# 生成 JWT 密钥
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 生成数据库密码
openssl rand -base64 32
```

---

## SSL 证书配置

### 使用 Let's Encrypt（推荐）

```bash
# 1. 设置域名和邮箱
export DOMAIN=your-domain.com
export ACME_EMAIL=admin@your-domain.com

# 2. 运行初始化脚本
./scripts/init-ssl.sh

# 3. 脚本会自动：
#    - 生成临时自签名证书
#    - 启动 Nginx
#    - 获取 Let's Encrypt 证书
#    - 配置自动续期
```

### 使用自定义证书

```bash
# 将证书文件放入 nginx/ssl 目录
cp your-cert.pem nginx/ssl/fullchain.pem
cp your-key.pem nginx/ssl/privkey.pem

# 重启 Nginx
docker-compose restart nginx
```

### 证书续期

```bash
# 手动续期
cd /opt/studyhub
./certbot/renew.sh

# 自动续期（添加到 crontab）
0 3 * * * cd /opt/studyhub && ./certbot/renew.sh >> /var/log/studyhub-cert-renewal.log 2>&1
```

---

## 备份与恢复

### 自动备份

```bash
# 执行完整备份
./scripts/backup.sh

# 仅备份数据库
./scripts/backup.sh postgres

# 仅备份 Redis
./scripts/backup.sh redis
```

### 配置定时备份

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 3 点备份
0 3 * * * cd /opt/studyhub && ./scripts/backup.sh >> /var/log/studyhub-backup.log 2>&1

# 每周清理旧备份
0 4 * * 0 cd /opt/studyhub && ./scripts/backup.sh cleanup
```

### 恢复数据

```bash
# 从备份文件恢复
./scripts/backup.sh restore backups/postgres_20240322_120000.sql.gz

# 恢复 Redis
./scripts/backup.sh restore backups/redis_20240322_120000.rdb.gz
```

### S3 备份（可选）

```bash
# 配置 S3 环境变量
export S3_BUCKET=your-backup-bucket
export S3_ACCESS_KEY=your-access-key
export S3_SECRET_KEY=your-secret-key
export S3_ENDPOINT=https://s3.amazonaws.com  # 可选，用于兼容 S3 的服务

# 备份会自动上传到 S3
./scripts/backup.sh
```

---

## 监控与日志

### 启动监控栈

```bash
# 启动 Prometheus + Grafana
docker-compose -f docker-compose.yml \
               -f docker-compose.prod.yml \
               -f docker-compose.monitoring.yml \
               up -d

# 启动日志收集
docker-compose -f docker-compose.yml \
               -f docker-compose.prod.yml \
               -f docker-compose.logging.yml \
               up -d
```

### 访问监控面板

| 服务 | 地址 | 默认账号 |
|------|------|---------|
| Grafana | http://localhost:3001 | admin/admin |
| Prometheus | http://localhost:9090 | - |
| Alertmanager | http://localhost:9093 | - |

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs -f backend

# 查看最近 100 行
docker-compose logs --tail=100 backend
```

### 日志轮转

生产环境已配置自动日志轮转：
- 单个日志文件最大 100MB
- 保留最近 5 个日志文件

---

## 故障排查

### 服务无法启动

```bash
# 检查日志
docker-compose logs

# 检查端口占用
sudo netstat -tlnp | grep -E ':(80|443|3000|8080)'

# 检查磁盘空间
df -h

# 检查内存使用
free -h
```

### 数据库连接失败

```bash
# 检查数据库服务
docker-compose ps postgres

# 检查数据库日志
docker-compose logs postgres

# 手动连接测试
docker-compose exec postgres psql -U postgres -d studyhub
```

### 502 Bad Gateway

```bash
# 检查后端服务
docker-compose ps backend
docker-compose logs backend

# 检查 Nginx 配置
docker-compose exec nginx nginx -t

# 重启 Nginx
docker-compose restart nginx
```

### 性能问题

```bash
# 查看资源使用
docker stats

# 查看慢查询（PostgreSQL）
docker-compose exec postgres psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# 重启服务
docker-compose restart backend
```

---

## CI/CD 配置

### GitHub Actions 配置

1. **设置 Secrets**:
   - `SSH_PRIVATE_KEY`: 服务器私钥
   - `SSH_HOST`: 服务器地址
   - `SSH_USER`: 服务器用户名
   - `DEPLOY_PATH`: 部署路径

2. **配置 Variables**:
   - `DEPLOY_URL`: 应用访问地址

### 手动触发部署

```bash
# 在 GitHub Actions 页面手动触发
# 或使用 gh CLI
gh workflow run deploy.yml
```

### 回滚部署

```bash
# 使用部署脚本回滚
./scripts/deploy.sh --rollback

# 或手动回滚到上一个镜像
docker-compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 常用命令速查

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f [service]

# 执行命令
docker-compose exec [service] [command]

# 数据库迁移
docker-compose exec backend npm run migrate

# 备份数据
./scripts/backup.sh

# 部署更新
./scripts/deploy.sh

# 查看状态
docker-compose ps
docker stats
```

---

## 安全建议

1. **及时更新**: 定期更新 Docker 镜像和系统补丁
2. **强密码**: 使用复杂的数据库和 JWT 密钥
3. **防火墙**: 仅开放必要的端口 (80, 443)
4. **备份**: 定期备份数据并测试恢复流程
5. **监控**: 启用监控和告警，及时发现异常

---

## 获取帮助

- **GitHub Issues**: https://github.com/yourusername/studyhub/issues
- **文档**: https://docs.studyhub.local
- **邮件**: support@studyhub.local

---

*最后更新: 2026-03-23*
