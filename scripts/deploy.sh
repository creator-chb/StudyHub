#!/bin/bash
# =============================================
# StudyHub 生产环境部署脚本
# =============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 打印信息
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查环境
check_environment() {
    step "检查部署环境..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose 未安装"
        exit 1
    fi
    
    # 检查 .env.docker 文件
    if [ ! -f ".env.docker" ]; then
        if [ -f ".env.docker.example" ]; then
            warn ".env.docker 文件不存在，从模板创建..."
            cp .env.docker.example .env.docker
            warn "请编辑 .env.docker 文件并设置正确的配置"
            exit 1
        else
            error ".env.docker 文件不存在"
            exit 1
        fi
    fi
    
    info "环境检查通过"
}

# 拉取最新代码
pull_latest() {
    step "拉取最新代码..."
    
    if [ -d ".git" ]; then
        git pull origin main
        info "代码已更新"
    else
        warn "不是 Git 仓库，跳过代码更新"
    fi
}

# 备份数据
backup_data() {
    step "备份数据..."
    
    mkdir -p "$BACKUP_DIR"
    
    # 备份数据库
    if docker-compose ps postgres | grep -q "Up"; then
        info "备份 PostgreSQL 数据库..."
        docker-compose exec -T postgres pg_dump -U postgres studyhub > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
        info "数据库备份完成: $BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    fi
    
    # 备份 Redis
    if docker-compose ps redis | grep -q "Up"; then
        info "备份 Redis 数据..."
        docker-compose exec -T redis redis-cli BGSAVE
        # 等待保存完成
        sleep 2
        docker cp "$(docker-compose ps -q redis)":/data/dump.rdb "$BACKUP_DIR/redis_backup_$TIMESTAMP.rdb"
        info "Redis 备份完成: $BACKUP_DIR/redis_backup_$TIMESTAMP.rdb"
    fi
}

# 构建镜像
build_images() {
    step "构建 Docker 镜像..."
    
    docker-compose $COMPOSE_FILES build --no-cache
    
    info "镜像构建完成"
}

# 执行数据库迁移
run_migrations() {
    step "执行数据库迁移..."
    
    # 确保数据库服务已启动
    docker-compose up -d postgres redis
    
    # 等待数据库就绪
    info "等待数据库就绪..."
    sleep 10
    
    # 执行迁移
    docker-compose run --rm backend npm run migrate
    
    info "数据库迁移完成"
}

# 部署服务
deploy_services() {
    step "部署服务..."
    
    # 滚动更新
    docker-compose $COMPOSE_FILES up -d --remove-orphans
    
    info "服务部署完成"
}

# 健康检查
health_check() {
    step "执行健康检查..."
    
    # 等待服务启动
    sleep 10
    
    # 检查后端服务
    if docker-compose ps backend | grep -q "Up"; then
        info "后端服务运行正常"
    else
        error "后端服务未正常运行"
        return 1
    fi
    
    # 检查前端服务
    if docker-compose ps frontend | grep -q "Up"; then
        info "前端服务运行正常"
    else
        error "前端服务未正常运行"
        return 1
    fi
    
    # 检查 Nginx
    if docker-compose ps nginx | grep -q "Up"; then
        info "Nginx 服务运行正常"
    else
        warn "Nginx 服务未运行（可能未配置）"
    fi
    
    # 检查 API 响应
    if curl -sf http://localhost:3000/api/health > /dev/null; then
        info "API 健康检查通过"
    else
        error "API 健康检查失败"
        return 1
    fi
    
    info "所有健康检查通过"
}

# 清理旧资源
cleanup() {
    step "清理旧资源..."
    
    # 清理未使用的镜像
    docker image prune -af --filter "until=168h"
    
    # 清理未使用的卷
    docker volume prune -f
    
    # 清理旧备份（保留最近 7 天）
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
        find "$BACKUP_DIR" -name "*.rdb" -mtime +7 -delete
        info "已清理旧备份文件"
    fi
    
    info "清理完成"
}

# 显示状态
show_status() {
    step "当前服务状态"
    
    docker-compose ps
    
    echo ""
    info "部署完成！"
    info "前端地址: http://localhost:8080"
    info "后端 API: http://localhost:3000"
    info "API 文档: http://localhost:3000/api/docs"
}

# 回滚功能
rollback() {
    warn "执行回滚..."
    
    # 停止当前服务
    docker-compose $COMPOSE_FILES down
    
    # 恢复数据库（如果有备份）
    LATEST_BACKUP=$(ls -t $BACKUP_DIR/db_backup_*.sql 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        info "恢复数据库: $LATEST_BACKUP"
        docker-compose up -d postgres
        sleep 5
        docker-compose exec -T postgres psql -U postgres studyhub < "$LATEST_BACKUP"
    fi
    
    info "回滚完成"
}

# 使用说明
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help      显示帮助信息"
    echo "  -b, --backup    仅执行备份"
    echo "  -m, --migrate   仅执行数据库迁移"
    echo "  -r, --rollback  执行回滚"
    echo "  -s, --status    显示服务状态"
    echo "  --no-backup     部署时不备份"
    echo ""
    echo "Examples:"
    echo "  $0              完整部署流程"
    echo "  $0 --backup     仅备份数据"
    echo "  $0 --migrate    仅执行迁移"
    echo "  $0 --rollback   回滚到上一个版本"
}

# 主函数
main() {
    local DO_BACKUP=true
    local DO_BUILD=true
    local DO_DEPLOY=true
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -b|--backup)
                check_environment
                backup_data
                exit 0
                ;;
            -m|--migrate)
                check_environment
                run_migrations
                exit 0
                ;;
            -r|--rollback)
                rollback
                exit 0
                ;;
            -s|--status)
                show_status
                exit 0
                ;;
            --no-backup)
                DO_BACKUP=false
                shift
                ;;
            *)
                error "未知参数: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # 执行部署流程
    info "=========================================="
    info "StudyHub 生产环境部署"
    info "=========================================="
    
    check_environment
    pull_latest
    
    if [ "$DO_BACKUP" = true ]; then
        backup_data
    fi
    
    if [ "$DO_BUILD" = true ]; then
        build_images
    fi
    
    run_migrations
    
    if [ "$DO_DEPLOY" = true ]; then
        deploy_services
        health_check
        cleanup
        show_status
    fi
    
    info "=========================================="
    info "部署成功完成!"
    info "=========================================="
}

# 执行主函数
main "$@"
