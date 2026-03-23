/**
 * StudyHub 前端构建脚本
 * 使用 esbuild 进行资源压缩和打包
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// 配置
const config = {
    entryPoints: [
        './src/js/app.js',
    ],
    outdir: './dist/js',
    bundle: false, // 不打包，保持模块化
    minify: true,
    sourcemap: false,
    target: ['es2020'],
    format: 'iife',
    platform: 'browser',
    logLevel: 'info',
    define: {
        'process.env.NODE_ENV': '"production"',
    },
};

// CSS 文件列表
const cssFiles = [
    './src/css/main.css',
];

// JS 模块文件列表（按加载顺序）
const jsModules = [
    'config.js',
    'utils.js',
    'errorHandler.js',
    'loading.js',
    'storage/AbstractStorage.js',
    'storage/LocalStorageAdapter.js',
    'storage/ApiStorageAdapter.js',
    'storage.js',
    'api.js',
    'auth.js',
    'syncSettings.js',
    'toast.js',
    'modal.js',
    'theme.js',
    'keyboard.js',
    'touch.js',
    'linkManager.js',
    'taskManager.js',
    'renderer.js',
    'undoManager.js',
    'app.js',
];

/**
 * 压缩 CSS
 */
async function minifyCSS() {
    console.log('📦 压缩 CSS...');
    
    let allCSS = '';
    for (const file of cssFiles) {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            allCSS += content + '\n';
        }
    }

    // 简单的 CSS 压缩
    const minified = allCSS
        .replace(/\/\*[\s\S]*?\*\//g, '') // 移除注释
        .replace(/\s+/g, ' ') // 压缩空白
        .replace(/\s*([{}:;,>+~])\s*/g, '$1') // 移除符号周围的空白
        .replace(/;}/g, '}') // 移除最后的分号
        .trim();

    const distDir = './dist/css';
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(distDir, 'main.min.css'), minified);
    console.log(`✅ CSS 压缩完成: ${minified.length} 字节`);
}

/**
 * 压缩 JavaScript 文件
 */
async function minifyJS() {
    console.log('📦 压缩 JavaScript...');
    
    const distDir = './dist/js/modules';
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }
    
    // 创建存储模块目录
    const storageDir = './dist/js/modules/storage';
    if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
    }

    let totalSize = 0;

    for (const module of jsModules) {
        const inputPath = `./src/js/modules/${module}`;
        const outputPath = `./dist/js/modules/${module}`;
        
        if (fs.existsSync(inputPath)) {
            try {
                const result = await esbuild.build({
                    entryPoints: [inputPath],
                    outfile: outputPath,
                    minify: true,
                    target: ['es2020'],
                    format: 'iife',
                    platform: 'browser',
                    logLevel: 'silent',
                });
                
                const stats = fs.statSync(outputPath);
                totalSize += stats.size;
            } catch (error) {
                console.error(`❌ 压缩失败: ${module}`, error.message);
            }
        }
    }

    console.log(`✅ JavaScript 压缩完成: ${totalSize} 字节`);
}

/**
 * 复制 HTML 文件
 */
function copyHTML() {
    console.log('📄 复制 HTML...');
    
    let html = fs.readFileSync('./index.html', 'utf8');
    
    // 更新资源引用路径
    html = html
        .replace(/src\/css\/main\.css/g, 'css/main.min.css')
        .replace(/src\/js\/modules\/([^"]+)\.js/g, 'js/modules/$1.js')
        .replace(/\?v=[0-9]+/g, ''); // 移除版本号查询参数
    
    fs.writeFileSync('./dist/index.html', html);
    console.log('✅ HTML 复制完成');
}

/**
 * 创建 dist 目录
 */
function createDistDir() {
    if (!fs.existsSync('./dist')) {
        fs.mkdirSync('./dist', { recursive: true });
    }
}

/**
 * 主构建函数
 */
async function build() {
    console.log('🚀 开始构建 StudyHub 前端...\n');
    
    const startTime = Date.now();
    
    try {
        createDistDir();
        await minifyCSS();
        await minifyJS();
        copyHTML();
        
        const duration = Date.now() - startTime;
        console.log(`\n✨ 构建完成! 耗时: ${duration}ms`);
        console.log('📂 输出目录: ./dist');
    } catch (error) {
        console.error('❌ 构建失败:', error);
        process.exit(1);
    }
}

// 监听模式
if (process.argv.includes('--watch')) {
    console.log('👀 监听模式启动...');
    build();
    
    // 简单的文件监听
    fs.watch('./src', { recursive: true }, (eventType, filename) => {
        console.log(`🔄 文件变更: ${filename}`);
        build();
    });
} else {
    build();
}
