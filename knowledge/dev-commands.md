# 开发与部署命令手册

> 本文档整合了 StudyHub 项目开发与部署过程中常用的命令速查，涵盖 SSH、Linux、Docker、数据库等核心操作。

---

## 📚 目录

1. [SSH 远程连接命令](#1-ssh-远程连接命令)
2. [Linux 系统管理命令](#2-linux-系统管理命令)
3. [Docker 容器管理命令](#3-docker-容器管理命令)
4. [Docker Compose 编排命令](#4-docker-compose-编排命令)
5. [文件操作与文本处理命令](#5-文件操作与文本处理命令)
6. [网络诊断命令](#6-网络诊断命令)
7. [数据库操作命令](#7-数据库操作命令)
8. [Git 版本控制命令](#8-git-版本控制命令)
9. [实用组合命令](#9-实用组合命令)

---

## 1. SSH 远程连接命令

### 1.1 基础连接

```bash
# 使用私钥连接远程服务器
ssh -i "私钥路径" 用户名@服务器IP

# 实际示例
ssh -i "D:\\001-cgc\\test.pem" root@121.199.45.201
```

**参数说明：**
| 参数 | 含义 | 示例 |
|------|------|------|
| `-i` | 指定私钥文件 | `-i "path/to/key.pem"` |
| `root` | 登录用户名 | 阿里云默认 root |
| `121.199.45.201` | 服务器公网IP | 你的实际IP |

### 1.2 执行远程命令

```bash
# 连接后执行单条命令（不进入交互式shell）
ssh -i "私钥路径" root@IP "命令"

# 示例：查看远程目录
ssh -i "D:\\001-cgc\\test.pem" root@121.199.45.201 "ls -la /opt/StudyHub"

# 示例：查看Docker状态
ssh -i "D:\\001-cgc\\test.pem" root@121.199.45.201 "docker ps"
```

### 1.3 执行多条命令

```bash
# 使用 && 连接多条命令（顺序执行，失败则停止）
ssh -i "key.pem" root@IP "cd /opt/StudyHub && docker compose ps"

# 使用 ; 连接多条命令（顺序执行，失败继续）
ssh -i "key.pem" root@IP "cd /opt/StudyHub; ls -la; docker ps"
```

---

## 2. Linux 系统管理命令

### 2.1 系统信息查看

```bash
# 查看操作系统版本
cat /etc/os-release

# 查看系统内核
uname -a

# 查看磁盘空间
df -h

# 查看内存使用
free -h

# 查看系统时间
date
```

### 2.2 进程管理

```bash
# 查看所有进程
ps aux

# 查看特定进程
ps aux | grep nginx
ps aux | grep node

# 查看端口占用
netstat -tlnp
# 或
ss -tlnp

# 查看资源使用统计
top
# 或更友好的
htop
```

### 2.3 服务管理（systemctl）

```bash
# 启动服务
sudo systemctl start docker

# 停止服务
sudo systemctl stop docker

# 重启服务
sudo systemctl restart docker

# 设置开机自启
sudo systemctl enable docker

# 查看服务状态
sudo systemctl status docker

# 重新加载配置
sudo systemctl daemon-reload
```

### 2.4 软件包管理（yum - CentOS/RHEL/Alibaba Cloud）

```bash
# 更新软件包列表
sudo yum update -y

# 安装软件
sudo yum install -y nodejs npm

# 安装多个软件
sudo yum install -y vim wget curl net-tools

# 搜索软件包
sudo yum search nginx

# 查看已安装
sudo yum list installed | grep nodejs
```

**注意：** Ubuntu/Debian 使用 `apt` 而非 `yum`

---

## 3. Docker 容器管理命令

### 3.1 镜像管理

```bash
# 查看本地镜像
docker images

# 拉取镜像
docker pull nginx:alpine
docker pull postgres:15-alpine
docker pull redis:7-alpine

# 删除镜像
docker rmi 镜像ID

# 删除所有无用镜像
docker image prune -a

# 查看镜像历史
docker history 镜像名
```

### 3.2 容器生命周期

```bash
# 查看运行中的容器
docker ps

# 查看所有容器（包括停止的）
docker ps -a

# 启动容器
docker start 容器名

# 停止容器
docker stop 容器名

# 重启容器
docker restart 容器名

# 删除容器
docker rm 容器名

# 强制删除运行中的容器
docker rm -f 容器名
```

### 3.3 容器操作

```bash
# 查看容器日志
docker logs 容器名
docker logs -f 容器名          # 实时跟踪
docker logs --tail 100 容器名  # 最后100行

# 进入容器内部
docker exec -it 容器名 /bin/bash
docker exec -it 容器名 /bin/sh  # alpine系统

# 在容器外执行命令
docker exec 容器名 命令
docker exec studyhub-backend node -v

# 查看容器信息
docker inspect 容器名

# 查看容器资源使用
docker stats

# 复制文件到容器
docker cp 本地文件 容器名:容器路径

# 从容器复制文件出来
docker cp 容器名:容器路径 本地路径
```

### 3.4 容器健康检查

```bash
# 查看容器健康状态
docker inspect --format='{{.State.Health.Status}}' 容器名

# 查看健康检查日志
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' 容器名

# 查看完整状态
docker inspect 容器名 | grep -A 10 "Health"
```

---

## 4. Docker Compose 编排命令

### 4.1 基础命令

```bash
# 启动所有服务（后台运行）
docker compose up -d

# 启动并重新构建镜像
docker compose up -d --build

# 停止所有服务
docker compose down

# 停止并删除卷（慎用）
docker compose down -v

# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs
docker compose logs -f              # 实时跟踪
docker compose logs -f backend    # 只看后端日志
docker compose logs --tail 50     # 最后50行
```

### 4.2 服务管理

```bash
# 构建特定服务
docker compose build 服务名
docker compose build backend

# 重启特定服务
docker compose restart 服务名
docker compose restart backend

# 停止特定服务
docker compose stop 服务名

# 启动特定服务
docker compose start 服务名

# 删除特定服务容器
docker compose rm 服务名
```

### 4.3 执行命令

```bash
# 在服务中执行命令
docker compose exec 服务名 命令

# 示例：后端执行迁移
docker compose exec backend npm run migrate

# 示例：进入数据库
docker compose exec postgres psql -U postgres

# 示例：查看Redis
docker compose exec redis redis-cli
```

### 4.4 多文件组合

```bash
# 组合多个配置文件启动
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.monitoring.yml \
  up -d
```

---

## 5. 文件操作与文本处理命令

### 5.1 文件查看

```bash
# 查看文件内容
cat 文件名

# 分页查看
less 文件名
more 文件名

# 查看前N行
head -n 20 文件名

# 查看后N行
tail -n 20 文件名

# 实时查看文件更新
tail -f 日志文件
```

### 5.2 文本搜索（grep）

```bash
# 基础搜索
grep "关键词" 文件名

# 忽略大小写
grep -i "关键词" 文件名

# 显示行号
grep -n "关键词" 文件名

# 反向匹配（排除）
grep -v "关键词" 文件名

# 正则表达式
grep -E "正则" 文件名

# 搜索多个文件
grep "关键词" *.js

# 递归搜索目录
grep -r "关键词" 目录/

# 只显示文件名
grep -l "关键词" *.js

# 显示前后上下文
grep -C 3 "关键词" 文件名  # 前后3行
grep -B 3 "关键词" 文件名  # 前3行
grep -A 3 "关键词" 文件名  # 后3行
```

### 5.3 文本替换（sed）

```bash
# 基础替换（每行第一个匹配）
sed 's/旧字符串/新字符串/' 文件名

# 全局替换（每行所有匹配）
sed 's/旧字符串/新字符串/g' 文件名

# 直接修改文件（-i）
sed -i 's/localhost/127.0.0.1/g' 文件名

# 替换特定行
sed '3s/old/new/' 文件名        # 第3行
sed '/pattern/s/old/new/' 文件名 # 包含pattern的行

# 删除行
sed '3d' 文件名                 # 删除第3行
sed '/pattern/d' 文件名         # 删除包含pattern的行

# 实际示例：修改前端API地址
sed -i 's/localhost:3000/121.199.45.201:3000/g' api.js
```

### 5.4 文件与目录操作

```bash
# 列出文件
ls -la

# 创建目录
mkdir -p 目录名

# 复制文件/目录
cp 源文件 目标文件
cp -r 源目录 目标目录

# 移动/重命名
mv 源文件 目标文件

# 删除文件
rm 文件名
rm -f 文件名      # 强制删除

# 删除目录
rm -r 目录名
rm -rf 目录名     # 强制递归删除（慎用）

# 创建空文件
touch 文件名

# 查看文件大小
du -sh 文件名
du -sh 目录名
```

### 5.5 文本处理（awk）

```bash
# 打印特定列
awk '{print $1}' 文件名      # 第1列
awk '{print $1,$3}' 文件名   # 第1和第3列

# 按分隔符处理
awk -F':' '{print $1}' /etc/passwd

# 条件过滤
awk '$3 > 100 {print $0}' 文件名
```

---

## 6. 网络诊断命令

### 6.1 连通性测试

```bash
# Ping测试
ping 121.199.45.201
ping -c 4 google.com        # 只发4次

# 测试端口连通
curl -v telnet://IP:端口
curl -v telnet://121.199.45.201:3000

# 快速测试HTTP
curl -I http://IP:端口      # 只看响应头
curl http://IP:端口         # 看完整响应
curl -s http://IP:端口      # 静默模式
```

### 6.2 端口与连接

```bash
# 查看所有监听端口
netstat -tlnp
ss -tlnp                    # 新版推荐

# 查看特定端口
netstat -tlnp | grep :3000
ss -tlnp | grep :8080

# 查看网络连接
netstat -an
ss -s                       # 统计信息

# 查看路由表
ip route
route -n
```

### 6.3 DNS查询

```bash
# 解析域名
nslookup google.com
dig google.com
host google.com

# 查看本地DNS配置
cat /etc/resolv.conf
```

---

## 7. 数据库操作命令

### 7.1 PostgreSQL

```bash
# 进入PostgreSQL容器
docker compose exec postgres psql -U postgres

# 常用psql命令
\l                          # 列出所有数据库
\c 数据库名                  # 切换数据库
\dt                         # 列出所有表
\d 表名                     # 查看表结构
\q                          # 退出

# SQL命令示例
SELECT * FROM users;
SELECT * FROM links LIMIT 10;
```

### 7.2 Redis

```bash
# 进入Redis容器
docker compose exec redis redis-cli

# 常用Redis命令
KEYS *                      # 列出所有键
GET key名                   # 获取值
SET key名 值                # 设置值
DEL key名                   # 删除键
FLUSHALL                    # 清空所有数据（慎用）
INFO                        # 查看信息
MONITOR                     # 实时监控命令
```

---

## 8. Git 版本控制命令

### 8.1 基础操作

```bash
# 克隆仓库
git clone <仓库地址>
git clone git@github.com:用户名/仓库.git

# 查看状态
git status

# 添加文件到暂存区
git add 文件名
git add .                   # 添加所有变更

# 提交变更
git commit -m "提交信息"
git commit -m "feat: 新功能"
git commit -m "fix: 修复bug"

# 推送到远程
git push origin 分支名
git push origin main
```

### 8.2 分支管理

```bash
# 查看分支
git branch                  # 本地分支
git branch -r               # 远程分支
git branch -a               # 所有分支

# 创建分支
git branch 新分支名
git checkout -b 新分支名     # 创建并切换

# 切换分支
git checkout 分支名
git switch 分支名           # 新版命令

# 合并分支
git checkout main
git merge 功能分支

# 删除分支
git branch -d 分支名        # 已合并
git branch -D 分支名        # 强制删除
```

### 8.3 版本回退

```bash
# 查看提交历史
git log
git log --oneline           # 简洁格式
git log --graph             # 图形化

# 回退到指定版本
git checkout <commit-id>

# 回退并丢弃变更
git reset --hard <commit-id>

# 查看所有操作记录
git reflog
```

### 8.4 远程操作

```bash
# 查看远程仓库
git remote -v

# 添加远程仓库
git remote add origin <地址>

# 拉取更新
git pull origin main

# 获取远程分支
git fetch origin

# 查看远程分支
git branch -r
```

---

## 9. 实用组合命令

### 9.1 部署常用组合

```bash
# 1. 一键查看所有服务状态
docker compose ps && docker compose logs --tail 5

# 2. 重启并查看日志
docker compose restart backend && docker compose logs -f backend

# 3. 进入容器调试
docker compose exec backend /bin/sh

# 4. 查看容器环境变量
docker compose exec backend env | grep -E 'NODE|DB|REDIS'

# 5. 批量修改配置后重启
sed -i 's/old/new/g' file && docker compose restart
```

### 9.2 故障排查组合

```bash
# 1. 检查服务健康状态
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 2. 查看所有服务日志（最近10行）
for service in backend frontend postgres redis; do
  echo "=== $service ==="
  docker compose logs --tail 10 $service
done

# 3. 检查端口占用
ss -tlnp | grep -E ':(3000|8080|5432|6379)'

# 4. 测试所有端点
curl -s http://localhost:3000/api/health
curl -s http://localhost:8080
curl -s telnet://localhost:5432
curl -s telnet://localhost:6379
```

### 9.3 日志分析组合

```bash
# 1. 统计错误出现次数
docker compose logs | grep -i error | wc -l

# 2. 查找特定时间段的日志
docker compose logs | grep "2026-03-25"

# 3. 实时监控多个服务
docker compose logs -f backend frontend

# 4. 提取关键信息
docker compose logs backend | grep -E "(error|warn|listening)"
```

### 9.4 文件处理组合

```bash
# 1. 查找并替换多个文件
find . -name "*.js" -exec sed -i 's/old/new/g' {} \;

# 2. 批量修改文件权限
find . -type f -name "*.sh" -exec chmod +x {} \;

# 3. 查找大文件
du -sh * | grep -E "[0-9]+M|[0-9]+G"

# 4. 备份配置文件
cp docker-compose.yml docker-compose.yml.bak.$(date +%Y%m%d)
```

---

## 📝 命令速查卡

### Docker Compose 速查
```bash
up -d       # 启动
down        # 停止
ps          # 查看状态
logs -f     # 跟踪日志
exec        # 执行命令
restart     # 重启
build       # 构建
```

### 文本处理速查
```bash
grep "x" file       # 搜索
sed 's/o/n/g' file  # 替换
awk '{print $1}'    # 取列
cat file | less     # 分页
head/tail -n 10     # 取前后
```

### 网络速查
```bash
ping IP             # 连通性
curl -I URL         # HTTP测试
ss -tlnp            # 端口监听
netstat -an         # 连接状态
```

---

*文档创建时间：2026-03-25*
*适用场景：StudyHub 项目部署与运维*
