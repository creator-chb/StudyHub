#!/bin/bash
# =============================================
# StudyHub 数据备份脚本
# 支持 PostgreSQL 和 Redis 备份
# =============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BACKUP_DIR=${BACKUP_DIR:-"./backups"}
RETENTION_DAYS=${RETENTION_DAYS:-7}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y%m%d)

# S3 配置（可选）
S3_BUCKET=${S3_BUCKET:-}
S3_ENDPOINT=${S3_ENDPOINT:-}
S3_ACCESS_KEY=${S3_ACCESS_KEY:-}
S3_SECRET_KEY=${S3_SECRET_KEY:-}

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
    
    # 创建备份目录
    mkdir -p "$BACKUP_DIR"
}

# 备份 PostgreSQL
backup_postgres() {
    step "备份 PostgreSQL 数据库..."
    
    local backup_file="$BACKUP_DIR/postgres_${DATE}_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    
    # 检查数据库是否运行
    if ! docker-compose ps postgres | grep -q "Up"; then
        error "PostgreSQL 服务未运行"
        return 1
    fi
    
    # 执行备份
    docker-compose exec -T postgres pg_dump \
        -U postgres \
        --clean \
        --if-exists \
        --verbose \
        studyhub > "$backup_file"
    
    # 压缩备份
    gzip "$backup_file"
    
    # 计算文件大小
    local file_size=$(du -h "$compressed_file" | cut -f1)
    
    info "PostgreSQL 备份完成: $compressed_file ($file_size)"
    echo "$compressed_file"
}

# 备份 Redis
backup_redis() {
    step "备份 Redis 数据..."
    
    local backup_file="$BACKUP_DIR/redis_${DATE}_${TIMESTAMP}.rdb"
    
    # 检查 Redis 是否运行
    if ! docker-compose ps redis | grep -q "Up"; then
        warn "Redis 服务未运行，跳过备份"
        return 0
    fi
    
    # 触发 BGSAVE
    docker-compose exec -T redis redis-cli BGSAVE
    
    # 等待保存完成
    sleep 2
    
    # 复制 RDB 文件
    local redis_container=$(docker-compose ps -q redis)
    docker cp "$redis_container:/data/dump.rdb" "$backup_file"
    
    # 压缩备份
    gzip -f "$backup_file"
    local compressed_file="${backup_file}.gz"
    
    # 计算文件大小
    local file_size=$(du -h "$compressed_file" | cut -f1)
    
    info "Redis 备份完成: $compressed_file ($file_size)"
    echo "$compressed_file"
}

# 备份配置文件
backup_configs() {
    step "备份配置文件..."
    
    local backup_file="$BACKUP_DIR/configs_${DATE}_${TIMESTAMP}.tar.gz"
    
    # 打包配置文件
    tar -czf "$backup_file" \
        .env.docker \
        docker-compose.yml \
        docker-compose.prod.yml \
        nginx/nginx.conf \
        2>/dev/null || warn "部分配置文件不存在"
    
    # 计算文件大小
    local file_size=$(du -h "$backup_file" | cut -f1)
    
    info "配置备份完成: $backup_file ($file_size)"
    echo "$backup_file"
}

# 上传到 S3（如果配置了）
upload_to_s3() {
    local file=$1
    
    if [ -z "$S3_BUCKET" ] || [ -z "$S3_ACCESS_KEY" ] || [ -z "$S3_SECRET_KEY" ]; then
        return 0
    fi
    
    step "上传到 S3..."
    
    # 检查是否安装了 AWS CLI
    if ! command -v aws &> /dev/null; then
        warn "AWS CLI 未安装，跳过 S3 上传"
        return 0
    fi
    
    # 配置 AWS CLI
    export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY"
    export AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY"
    
    if [ -n "$S3_ENDPOINT" ]; then
        export AWS_ENDPOINT_URL="$S3_ENDPOINT"
    fi
    
    # 上传文件
    local filename=$(basename "$file")
    aws s3 cp "$file" "s3://$S3_BUCKET/backups/$filename" --storage-class STANDARD_IA
    
    info "已上传到 S3: s3://$S3_BUCKET/backups/$filename"
}

# 清理旧备份
cleanup_old_backups() {
    step "清理旧备份（保留 $RETENTION_DAYS 天）..."
    
    local deleted_count=0
    
    # 清理本地备份
    while IFS= read -r file; do
        rm -f "$file"
        info "删除旧备份: $file"
        deleted_count=$((deleted_count + 1))
    done < <(find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS 2>/dev/null)
    
    if [ $deleted_count -eq 0 ]; then
        info "没有需要清理的旧备份"
    else
        info "已清理 $deleted_count 个旧备份"
    fi
    
    # 清理 S3 备份（如果配置了）
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        info "清理 S3 旧备份..."
        aws s3 ls "s3://$S3_BUCKET/backups/" | \
            awk '{print $4}' | \
            while read -r key; do
                # 这里可以添加 S3 文件日期检查逻辑
                : # 占位符
            done
    fi
}

# 列出备份
list_backups() {
    step "备份列表"
    
    echo ""
    echo "本地备份:"
    echo "---------"
    
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR)" ]; then
        ls -lh "$BACKUP_DIR" | tail -n +2 | awk '{printf "%-10s %s\n", $5, $9}'
    else
        echo "暂无备份"
    fi
    
    # S3 备份列表
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        echo ""
        echo "S3 备份:"
        echo "--------"
        aws s3 ls "s3://$S3_BUCKET/backups/" 2>/dev/null || echo "无法获取 S3 备份列表"
    fi
}

# 恢复备份
restore_backup() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        error "请指定备份文件路径"
        echo "用法: $0 restore <备份文件>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        error "备份文件不存在: $backup_file"
        exit 1
    fi
    
    warn "警告: 这将覆盖当前数据库数据！"
    read -p "确定要继续吗? 输入 'yes' 确认: " confirm
    
    if [ "$confirm" != "yes" ]; then
        info "操作已取消"
        exit 0
    fi
    
    step "恢复数据库..."
    
    # 检查文件类型
    if [[ "$backup_file" == *.sql.gz ]]; then
        # 解压并恢复
        gunzip -c "$backup_file" | docker-compose exec -T postgres psql -U postgres
    elif [[ "$backup_file" == *.sql ]]; then
        # 直接恢复
        docker-compose exec -T postgres psql -U postgres < "$backup_file"
    elif [[ "$backup_file" == *.rdb.gz ]]; then
        # Redis 恢复
        local temp_file="/tmp/redis_restore_$(date +%s).rdb"
        gunzip -c "$backup_file" > "$temp_file"
        docker cp "$temp_file" "$(docker-compose ps -q redis):/data/dump.rdb"
        rm -f "$temp_file"
        docker-compose restart redis
    else
        error "不支持的备份文件格式"
        exit 1
    fi
    
    info "恢复完成"
}

# 使用说明
usage() {
    echo "StudyHub 数据备份工具"
    echo ""
    echo "用法: $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  run             执行完整备份（默认）"
    echo "  postgres        仅备份 PostgreSQL"
    echo "  redis           仅备份 Redis"
    echo "  configs         仅备份配置文件"
    echo "  list            列出所有备份"
    echo "  restore <file>  从备份文件恢复"
    echo "  cleanup         清理旧备份"
    echo ""
    echo "环境变量:"
    echo "  BACKUP_DIR      备份目录（默认: ./backups）"
    echo "  RETENTION_DAYS  保留天数（默认: 7）"
    echo "  S3_BUCKET       S3 存储桶名称（可选）"
    echo "  S3_ENDPOINT     S3 端点（可选）"
    echo "  S3_ACCESS_KEY   S3 访问密钥（可选）"
    echo "  S3_SECRET_KEY   S3 密钥（可选）"
    echo ""
    echo "示例:"
    echo "  $0                    # 执行完整备份"
    echo "  $0 postgres           # 仅备份数据库"
    echo "  $0 list               # 查看备份列表"
    echo "  $0 restore backups/postgres_20240322_120000.sql.gz"
}

# 主函数
main() {
    check_environment
    
    case "${1:-run}" in
        run|backup)
            info "=========================================="
            info "StudyHub 数据备份"
            info "=========================================="
            
            local pg_backup=$(backup_postgres)
            local redis_backup=$(backup_redis)
            local config_backup=$(backup_configs)
            
            # 上传到 S3
            if [ -n "$S3_BUCKET" ]; then
                upload_to_s3 "$pg_backup"
                upload_to_s3 "$redis_backup"
                upload_to_s3 "$config_backup"
            fi
            
            # 清理旧备份
            cleanup_old_backups
            
            info "=========================================="
            info "备份完成!"
            info "=========================================="
            ;;
        postgres)
            backup_postgres
            ;;
        redis)
            backup_redis
            ;;
        configs)
            backup_configs
            ;;
        list)
            list_backups
            ;;
        restore)
            restore_backup "$2"
            ;;
        cleanup)
            cleanup_old_backups
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
