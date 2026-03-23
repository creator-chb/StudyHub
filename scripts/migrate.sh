#!/bin/bash
# =============================================
# StudyHub 数据库迁移脚本
# 支持自动迁移、回滚和状态检查
# =============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
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
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose 未安装"
        exit 1
    fi
}

# 等待数据库就绪
wait_for_db() {
    step "等待数据库就绪..."
    
    local retries=30
    local count=0
    
    while [ $count -lt $retries ]; do
        if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
            info "数据库已就绪"
            return 0
        fi
        
        count=$((count + 1))
        echo -n "."
        sleep 1
    done
    
    error "数据库连接超时"
    return 1
}

# 备份数据库
backup_database() {
    step "备份数据库..."
    
    mkdir -p "$BACKUP_DIR"
    
    local backup_file="$BACKUP_DIR/pre_migration_$TIMESTAMP.sql"
    
    docker-compose exec -T postgres pg_dump -U postgres studyhub > "$backup_file"
    
    info "数据库已备份到: $backup_file"
    echo "$backup_file"
}

# 执行迁移
run_migration() {
    step "执行数据库迁移..."
    
    # 确保数据库服务已启动
    docker-compose up -d postgres
    
    # 等待数据库就绪
    wait_for_db
    
    # 执行迁移
    docker-compose run --rm backend npm run migrate
    
    info "数据库迁移完成"
}

# 检查迁移状态
check_status() {
    step "检查迁移状态..."
    
    # 确保数据库服务已启动
    docker-compose up -d postgres
    
    # 等待数据库就绪
    wait_for_db
    
    # 查询当前版本
    info "当前数据库版本:"
    docker-compose exec -T postgres psql -U postgres -d studyhub -c "SELECT * FROM pgmigrations ORDER BY id DESC LIMIT 5;" 2>/dev/null || warn "无法获取迁移状态"
}

# 回滚迁移
rollback_migration() {
    step "回滚数据库迁移..."
    
    if [ -z "$1" ]; then
        warn "未指定回滚步数，默认回滚 1 步"
        local count=1
    else
        local count=$1
    fi
    
    # 先备份
    backup_database
    
    # 执行回滚
    docker-compose run --rm backend npx node-pg-migrate down $count
    
    info "已回滚 $count 个迁移"
}

# 创建新迁移
create_migration() {
    step "创建新迁移..."
    
    if [ -z "$1" ]; then
        error "请提供迁移名称"
        echo "用法: $0 create <迁移名称>"
        exit 1
    fi
    
    local name=$1
    
    docker-compose run --rm backend npx node-pg-migrate create "$name"
    
    info "迁移已创建"
}

# 重置数据库（危险操作）
reset_database() {
    warn "警告: 这将删除所有数据并重新运行迁移！"
    read -p "确定要继续吗? 输入 'yes' 确认: " confirm
    
    if [ "$confirm" != "yes" ]; then
        info "操作已取消"
        exit 0
    fi
    
    step "备份当前数据库..."
    backup_database
    
    step "重置数据库..."
    
    # 删除数据库
    docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS studyhub;" 2>/dev/null || true
    
    # 创建新数据库
    docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE studyhub;"
    
    # 执行所有迁移
    run_migration
    
    info "数据库已重置"
}

# 使用说明
usage() {
    echo "StudyHub 数据库迁移工具"
    echo ""
    echo "用法: $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  up              执行所有待处理的迁移"
    echo "  down [n]        回滚 n 个迁移（默认 1 个）"
    echo "  status          显示迁移状态"
    echo "  create <name>   创建新迁移文件"
    echo "  backup          备份数据库"
    echo "  reset           重置数据库（危险！）"
    echo "  redo            回滚并重新执行最后一个迁移"
    echo ""
    echo "示例:"
    echo "  $0 up                    # 执行所有迁移"
    echo "  $0 down 1                # 回滚 1 个迁移"
    echo "  $0 create add_user_table # 创建新迁移"
    echo "  $0 backup                # 备份数据库"
}

# 主函数
main() {
    check_environment
    
    case "${1:-up}" in
        up|migrate)
            # 默认先备份再迁移
            backup_database > /dev/null
            run_migration
            ;;
        down|rollback)
            rollback_migration "$2"
            ;;
        status)
            check_status
            ;;
        create)
            create_migration "$2"
            ;;
        backup)
            backup_database
            ;;
        reset)
            reset_database
            ;;
        redo)
            rollback_migration 1
            run_migration
            ;;
        -h|--help|help)
            usage
            exit 0
            ;;
        *)
            error "未知命令: $1"
            usage
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
