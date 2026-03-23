#!/bin/bash
# =============================================
# StudyHub SSL 证书初始化脚本
# 使用 Let's Encrypt 获取和续期 SSL 证书
# =============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
DOMAIN=${DOMAIN:-}
EMAIL=${ACME_EMAIL:-}
SSL_DIR="./nginx/ssl"
CERTBOT_DIR="./certbot"

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

# 检查依赖
check_dependencies() {
    info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
}

# 检查配置
check_config() {
    info "检查配置..."
    
    if [ -z "$DOMAIN" ]; then
        error "未设置 DOMAIN 环境变量"
        echo "请设置环境变量: export DOMAIN=your-domain.com"
        exit 1
    fi
    
    if [ -z "$EMAIL" ]; then
        warn "未设置 ACME_EMAIL 环境变量，将使用默认邮箱"
        EMAIL="admin@$DOMAIN"
    fi
    
    info "域名: $DOMAIN"
    info "邮箱: $EMAIL"
}

# 创建目录
setup_directories() {
    info "创建目录..."
    
    mkdir -p "$SSL_DIR"
    mkdir -p "$CERTBOT_DIR/www"
    mkdir -p "$CERTBOT_DIR/conf"
    
    info "目录创建完成"
}

# 生成自签名证书（用于首次启动）
generate_self_signed() {
    info "生成自签名证书（临时使用）..."
    
    openssl req -x509 -nodes -newkey rsa:4096 \
        -keyout "$SSL_DIR/privkey.pem" \
        -out "$SSL_DIR/fullchain.pem" \
        -days 1 \
        -subj "/CN=$DOMAIN" \
        -addext "subjectAltName=DNS:$DOMAIN,DNS:www.$DOMAIN"
    
    info "自签名证书生成完成"
}

# 使用 Certbot 获取证书
obtain_certificate() {
    info "使用 Certbot 获取 Let's Encrypt 证书..."
    
    docker run -it --rm \
        -v "$(pwd)/$CERTBOT_DIR/www:/var/www/certbot" \
        -v "$(pwd)/$CERTBOT_DIR/conf:/etc/letsencrypt" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN"
    
    # 复制证书到 nginx/ssl 目录
    cp "$CERTBOT_DIR/conf/live/$DOMAIN/fullchain.pem" "$SSL_DIR/"
    cp "$CERTBOT_DIR/conf/live/$DOMAIN/privkey.pem" "$SSL_DIR/"
    
    info "证书获取成功并已复制到 $SSL_DIR"
}

# 设置自动续期
setup_renewal() {
    info "设置证书自动续期..."
    
    # 创建续期脚本
    cat > "$CERTBOT_DIR/renew.sh" << 'EOF'
#!/bin/bash
set -e

DOMAIN=${DOMAIN:-}
SSL_DIR="./nginx/ssl"
CERTBOT_DIR="./certbot"

echo "[$(date)] 开始续期证书..."

docker run --rm \
    -v "$(pwd)/$CERTBOT_DIR/www:/var/www/certbot" \
    -v "$(pwd)/$CERTBOT_DIR/conf:/etc/letsencrypt" \
    certbot/certbot renew \
    --webroot \
    --webroot-path=/var/www/certbot \
    --quiet

# 复制新证书
cp "$CERTBOT_DIR/conf/live/$DOMAIN/fullchain.pem" "$SSL_DIR/"
cp "$CERTBOT_DIR/conf/live/$DOMAIN/privkey.pem" "$SSL_DIR/"

# 重载 Nginx
docker-compose exec nginx nginx -s reload

echo "[$(date)] 证书续期完成"
EOF
    
    chmod +x "$CERTBOT_DIR/renew.sh"
    
    info "续期脚本已创建: $CERTBOT_DIR/renew.sh"
    info "建议添加到 crontab: 0 3 * * * cd /path/to/studyhub && ./certbot/renew.sh"
}

# 主函数
main() {
    info "=========================================="
    info "StudyHub SSL 证书初始化"
    info "=========================================="
    
    check_dependencies
    check_config
    setup_directories
    
    # 检查是否已有证书
    if [ -f "$SSL_DIR/fullchain.pem" ] && [ -f "$SSL_DIR/privkey.pem" ]; then
        warn "证书文件已存在"
        read -p "是否重新获取证书? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "跳过证书获取"
            exit 0
        fi
    fi
    
    # 生成自签名证书用于首次启动
    generate_self_signed
    
    # 启动 Nginx（用于验证域名）
    info "启动 Nginx 服务..."
    docker-compose up -d nginx
    
    # 等待 Nginx 启动
    sleep 5
    
    # 获取 Let's Encrypt 证书
    obtain_certificate
    
    # 设置自动续期
    setup_renewal
    
    # 重载 Nginx 以使用新证书
    info "重载 Nginx..."
    docker-compose exec nginx nginx -s reload
    
    info "=========================================="
    info "SSL 证书初始化完成!"
    info "=========================================="
    info "证书位置: $SSL_DIR"
    info "续期脚本: $CERTBOT_DIR/renew.sh"
}

# 执行主函数
main "$@"
