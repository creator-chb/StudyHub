# 📝 开发笔记：VPN 环境下 Git 连接 GitHub 的代理配置指南

> **适用场景**：在使用 Clash/Verge 等代理工具时，解决 Git、curl 等命令行工具无法自动走代理导致连接 GitHub 失败的问题。
> **最后更新**：2026-03-19

---

## 1. 问题背景

即使开启了 VPN 客户端的“全局模式”或“系统代理”，部分命令行工具（如 `git`、`curl`、`wget`）往往**不会自动遵循系统代理设置**。这会导致在执行 `git push` 或 `git pull` 时出现以下错误：
- `Failed to connect to github.com port 443: Timed out`
- `Connection reset by peer`
- `curl: (28) Failed to connect...`

**根本原因**：这些工具需要显式的环境变量（`HTTP_PROXY` / `HTTPS_PROXY`）才能知道如何连接代理服务器。

---

## 2. 核心解决方案

### 步骤一：获取代理端口
打开你的代理客户端（如 Verge/Clash），查看 **HTTP/HTTPS 监听端口**。
- 常见默认端口：`7890`, `7897`, `10809`
- *本笔记以 Verge 默认端口 `7897` 为例*

### 步骤二：手动设置环境变量（临时生效）
根据你使用的终端类型（PowerShell 或 CMD），运行对应的命令。

#### 🔹 场景 A：PowerShell 终端（Qoder 默认 / Win10+ 推荐）
```powershell
$env:HTTP_PROXY = "http://127.0.0.1:7897"
$env:HTTPS_PROXY = "http://127.0.0.1:7897"
```

#### 🔹 场景 B：CMD 终端（传统命令提示符）
```cmd
set HTTP_PROXY=http://127.0.0.1:7897
set HTTPS_PROXY=http://127.0.0.1:7897
```

### 步骤三：验证连接
设置完成后，使用以下命令测试 GitHub 的 443 端口（HTTPS）是否连通。

**PowerShell:**
```powershell
Test-NetConnection -ComputerName github.com -Port 443
```
**CMD:**
```cmd
curl -I https://github.com
```
✅ **成功标志**：返回 `TcpTestSucceeded : True` 或 HTTP 状态码 `200`。

### 步骤四：配置 Git 显式代理（双重保险）
即使设置了环境变量，建议同时配置 Git 以确保万无一失：
```powershell
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897
# 可选：增大缓冲区以防大文件推送失败
git config --global http.postBuffer 524288000
```

---

## 3. 知识扩展：PowerShell vs CMD

为什么设置代理的命令不一样？因为它们是两种不同的 Shell。

| 特性 | **PowerShell** (现代/推荐) | **CMD** (传统/兼容) |
| :--- | :--- | :--- |
| **底层架构** | 基于 .NET，处理**对象** | 基于 DOS，处理**文本** |
| **变量语法** | `$变量名` (如 `$env:PATH`) | `%变量名%` (如 `%PATH%`) |
| **设置临时变量** | `$env:VAR = "值"` | `set VAR=值` |
| **查看变量** | `echo $env:VAR` | `echo %VAR%` |
| **清除变量** | `$env:VAR = ""` | `set VAR=` |
| **网络测试** | `Test-NetConnection` | `telnet` 或 `curl` |
| **适用场景** | Qoder 默认终端、现代运维脚本 | 老旧批处理脚本、快速简单命令 |

> ⚠️ **注意**：命令**不可混用**！在 PowerShell 中运行 `set ...` 可能无效或行为异常；在 CMD 中运行 `$env:...` 会直接报错。

---

## 4. 常见问题 (FAQ)

### Q1: 关闭终端后代理失效了怎么办？
上述命令设置的变量是**会话级（临时）**的，关闭窗口即失效。
- **临时方案**：每次新开终端都运行一次设置命令。
- **永久方案 (PowerShell)**：将设置命令写入配置文件。
  1. 运行 `notepad $PROFILE`
  2. 在文件中添加 `$env:HTTPS_PROXY = "http://127.0.0.1:7897"`
  3. 保存并重启终端。

### Q2: 我的代理端口不是 7897 怎么办？
请在你的代理客户端（Verge/Clash）设置中查看“HTTP 端口”或“混合端口”，将命令中的 `7897` 替换为你实际的端口号。

### Q3: 如何在 Qoder 云端环境使用？
如果 Qoder 是**云端容器**，你本地的 VPN **无法**直接作用于它。
- **现象**：本地能连，Qoder 终端里 `Test-NetConnection` 依然失败。
- **解决**：
  1. 寻找云服务商提供的内部代理地址。
  2. **推荐方案**：使用 **Gitee (码云)** 作为中转。
     - 本地推送到 Gitee -> Qoder 从 Gitee 拉取/推送（国内网络通常直连畅通）。

### Q4: 如何取消代理设置？
- **PowerShell**: `$env:HTTP_PROXY=""; $env:HTTPS_PROXY=""`
- **CMD**: `set HTTP_PROXY=` 和 `set HTTPS_PROXY=`
- **Git**: `git config --global --unset http.proxy`

---

## 5. 一键复制脚本 (PowerShell 版)

你可以直接复制以下代码块到 PowerShell 中一键完成配置和测试：

```powershell
# 1. 定义代理地址 (请根据实际端口修改 7897)
$ProxyUrl = "http://127.0.0.1:7897"

# 2. 设置当前会话环境变量
$env:HTTP_PROXY = $ProxyUrl
$env:HTTPS_PROXY = $ProxyUrl

# 3. 配置 Git 全局代理
git config --global http.proxy $ProxyUrl
git config --global https.proxy $ProxyUrl
git config --global http.postBuffer 524288000

# 4. 测试连接
Write-Host "正在测试 GitHub 连接..." -ForegroundColor Cyan
$testResult = Test-NetConnection -ComputerName github.com -Port 443 -InformationLevel Quiet

if ($testResult) {
    Write-Host "✅ 连接成功！代理已生效，可以执行 git push/pull 了。" -ForegroundColor Green
} else {
    Write-Host "❌ 连接失败。请检查代理端口是否正确，或 VPN 是否开启。" -ForegroundColor Red
}
```