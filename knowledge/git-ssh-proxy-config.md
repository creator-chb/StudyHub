# Git、SSH 与代理配置指南

> 本文档整合了 Git 版本控制相关的网络配置，包括 VPN 代理、SSH 密钥配置等内容，解决 Git 连接 GitHub 的各种网络问题。

---

## 📚 目录

1. [VPN 环境下 Git 代理配置](#1-vpn-环境下-git-代理配置)
2. [Windows PowerShell 下 Git SSH 配置](#2-windows-powershell-下-git-ssh-配置)
3. [常见问题与解决方案](#3-常见问题与解决方案)

---

## 1. VPN 环境下 Git 代理配置

### 1.1 问题背景

即使开启了 VPN 客户端的"全局模式"或"系统代理"，部分命令行工具（如 `git`、`curl`、`wget`）往往**不会自动遵循系统代理设置**。这会导致在执行 `git push` 或 `git pull` 时出现以下错误：
- `Failed to connect to github.com port 443: Timed out`
- `Connection reset by peer`
- `curl: (28) Failed to connect...`

**根本原因**：这些工具需要显式的环境变量（`HTTP_PROXY` / `HTTPS_PROXY`）才能知道如何连接代理服务器。

### 1.2 核心解决方案

#### 步骤一：获取代理端口
打开你的代理客户端（如 Verge/Clash），查看 **HTTP/HTTPS 监听端口**。
- 常见默认端口：`7890`, `7897`, `10809`
- *本笔记以 Verge 默认端口 `7897` 为例*

#### 步骤二：手动设置环境变量（临时生效）
根据你使用的终端类型（PowerShell 或 CMD），运行对应的命令。

##### 🔹 场景 A：PowerShell 终端（Win10+ 推荐）
```powershell
$env:HTTP_PROXY = "http://127.0.0.1:7897"
$env:HTTPS_PROXY = "http://127.0.0.1:7897"
```

##### 🔹 场景 B：CMD 终端（传统命令提示符）
```cmd
set HTTP_PROXY=http://127.0.0.1:7897
set HTTPS_PROXY=http://127.0.0.1:7897
```

#### 步骤三：验证连接
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

#### 步骤四：配置 Git 显式代理（双重保险）
即使设置了环境变量，建议同时配置 Git 以确保万无一失：
```powershell
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897
# 可选：增大缓冲区以防大文件推送失败
git config --global http.postBuffer 524288000
```

### 1.3 知识扩展：PowerShell vs CMD

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

### 1.4 一键复制脚本 (PowerShell 版)

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

---

## 2. Windows PowerShell 下 Git SSH 配置

### 2.1 检查当前 Git 配置状态

```powershell
git config --global --list
```

**输出示例：**
```
user.name=chb
user.email=2956529037@qq.com
http.proxy=http://127.0.0.1:7897
https.proxy=http://127.0.0.1:7897
```

**注意事项：**
- 如果看到 `http.proxy` 或 `https.proxy`，说明当前使用的是 HTTPS 代理配置
- SSH 配置不需要这些代理设置

### 2.2 生成 SSH 密钥对

#### 检查是否已存在 SSH 密钥
```powershell
Test-Path C:\Users\<你的用户名>\.ssh\id_ed25519
```
- 返回 `True`：已存在密钥，可跳过此步骤或重新生成
- 返回 `False`：需要生成新密钥

#### 生成新的 SSH 密钥（ED25519 类型）
```powershell
ssh-keygen -t ed25519 -C "your_email@example.com" -f C:\Users\<你的用户名>\.ssh\id_ed25519
```

**交互过程：**
```
Generating public/private ed25519 key pair.
Enter passphrase (empty for no passphrase): 
Enter same passphrase again: 
```

**重要提示：**
- 直接按回车键使用空密码（推荐用于开发环境）
- 如果需要更高安全性，可以设置密码短语

#### 查看生成的公钥内容
```powershell
Get-Content C:\Users\<你的用户名>\.ssh\id_ed25519.pub
```

### 2.3 将 SSH 公钥添加到 GitHub

1. 登录 GitHub：https://github.com/login
2. 点击右上角头像 → **Settings**
3. 左侧菜单选择 **SSH and GPG keys**
4. 点击 **New SSH key** 按钮
5. 填写信息：
   - **Title**: 给密钥起个名字，如 "Workstation-2026"
   - **Key type**: 选择 **Authentication Key**
   - **Key**: 粘贴刚才复制的公钥内容
6. 点击 **Add SSH key** 保存

### 2.4 配置 Git 使用 SSH 密钥

```powershell
git config --global core.sshCommand "ssh -i C:/Users/<你的用户名>/.ssh/id_ed25519"
```

**注意事项：**
- 路径使用正斜杠 `/` 而不是反斜杠 `\`
- 确保路径与实际密钥位置一致

### 2.5 首次连接 GitHub 并添加主机密钥

```powershell
ssh -T git@github.com
```

**首次连接时的提示：**
```
The authenticity of host 'github.com (20.205.243.166)' can't be established.
ED25519 key fingerprint is SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU.
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

**输入：** `yes` 然后按回车

**成功输出：**
```
Hi <你的 GitHub 用户名>! You've successfully authenticated, but GitHub does not provide shell access.
```

### 2.6 使用 SSH 进行 Git 操作

#### 克隆仓库
```powershell
git clone git@github.com:<username>/<repository>.git
```

#### 修改现有仓库的远程地址
```powershell
cd <仓库目录>
git remote set-url origin git@github.com:<username>/<repository>.git
```

#### 验证远程地址
```powershell
git remote -v
```

### 2.7 高级配置

#### 配置 SSH 配置文件
创建或编辑 `C:\Users\<你的用户名>\.ssh\config` 文件：

```
Host github.com
    HostName github.com
    User git
    IdentityFile C:/Users/<你的用户名>/.ssh/id_ed25519
    IdentitiesOnly yes
```

**好处：**
- 可以为不同的 Git 托管平台配置不同的密钥
- 更灵活的管理多个账户

#### 配置多个 SSH 密钥

1. 生成多个密钥：
```powershell
ssh-keygen -t ed25519 -C "personal@email.com" -f C:\Users\<用户名>\.ssh\id_ed25519_personal
ssh-keygen -t ed25519 -C "work@company.com" -f C:\Users\<用户名>\.ssh\id_ed25519_work
```

2. 配置 SSH config 文件：
```
Host github-personal
    HostName github.com
    User git
    IdentityFile C:/Users/<用户名>/.ssh/id_ed25519_personal

Host github-work
    HostName github.com
    User git
    IdentityFile C:/Users/<用户名>/.ssh/id_ed25519_work
```

---

## 3. 常见问题与解决方案

### 3.1 代理相关 FAQ

#### Q1: 关闭终端后代理失效了怎么办？
上述命令设置的变量是**会话级（临时）**的，关闭窗口即失效。
- **临时方案**：每次新开终端都运行一次设置命令。
- **永久方案 (PowerShell)**：将设置命令写入配置文件。
  1. 运行 `notepad $PROFILE`
  2. 在文件中添加 `$env:HTTPS_PROXY = "http://127.0.0.1:7897"`
  3. 保存并重启终端。

#### Q2: 我的代理端口不是 7897 怎么办？
请在你的代理客户端（Verge/Clash）设置中查看"HTTP 端口"或"混合端口"，将命令中的 `7897` 替换为你实际的端口号。

#### Q3: 如何取消代理设置？
- **PowerShell**: `$env:HTTP_PROXY=""; $env:HTTPS_PROXY=""`
- **CMD**: `set HTTP_PROXY=` 和 `set HTTPS_PROXY=`
- **Git**: `git config --global --unset http.proxy`

### 3.2 SSH 相关 FAQ

#### Q1: Permission denied (publickey)
**可能原因：**
- 公钥未添加到 GitHub
- 使用了错误的私钥
- 密钥文件权限问题

**解决方案：**
```powershell
# 检查公钥是否正确添加到 GitHub
Get-Content C:\Users\<用户名>\.ssh\id_ed25519.pub

# 确认 Git 配置的密钥路径
git config --global core.sshCommand

# 重新添加公钥到 GitHub
```

#### Q2: ssh-add 报错 "Error connecting to agent"
**原因：** ssh-agent 服务未运行

**解决方案 1（推荐）：** 使用 `git config core.sshCommand` 绕过 ssh-agent

**解决方案 2：** 以管理员身份启动 ssh-agent 服务：
```powershell
Set-Service -Name ssh-agent -StartupType Manual
Start-Service ssh-agent
ssh-add C:\Users\<用户名>\.ssh\id_ed25519
```

#### Q3: Known hosts 验证失败
**解决方案：**
```powershell
# 删除旧的 known_hosts 记录
Remove-Item C:\Users\<用户名>\.ssh\known_hosts

# 重新连接
ssh -T git@github.com
```

---

## 📝 快速配置清单

### 代理配置清单
- [ ] 确认代理客户端端口
- [ ] 设置环境变量 HTTP_PROXY / HTTPS_PROXY
- [ ] 配置 Git 代理
- [ ] 验证 GitHub 连接

### SSH 配置清单
- [ ] 生成 SSH 密钥对
- [ ] 复制公钥内容
- [ ] 在 GitHub 上添加 SSH 密钥
- [ ] 配置 `git config core.sshCommand`
- [ ] 首次连接 GitHub 确认主机密钥
- [ ] 测试 `ssh -T git@github.com`
- [ ] 克隆或推送测试仓库

---

## 附录：GitHub SSH 密钥指纹

官方 GitHub SSH 密钥指纹（用于验证）：

- **RSA**: `SHA256:nThbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY8`
- **ECDSA**: `SHA256:p2QAMXNIC1TJYWeIOttrVc98/R1BUFWu3/LiyKgUfQM`
- **ED25519**: `SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU`

来源：https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints

---

*最后更新：2026-03-19*
