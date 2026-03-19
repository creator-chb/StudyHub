# Windows PowerShell 下 Git SSH 配置完整指南

## 概述

本文档详细记录了在 Windows PowerShell 环境下为 Git 配置 SSH 连接的完整流程，包括每一步的具体操作命令、常见问题及解决方案。

---

## 一、检查当前 Git 配置状态

### 1.1 查看 Git 全局配置

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

---

## 二、生成 SSH 密钥对

### 2.1 检查是否已存在 SSH 密钥

```powershell
Test-Path C:\Users\<你的用户名>\.ssh\id_ed25519
```

- 返回 `True`：已存在密钥，可跳过此步骤或重新生成
- 返回 `False`：需要生成新密钥

### 2.2 生成新的 SSH 密钥（ED25519 类型）

```powershell
ssh-keygen -t ed25519 -C "your_email@example.com" -f C:\Users\<你的用户名>\.ssh\id_ed25519
```

**实际操作示例：**
```powershell
ssh-keygen -t ed25519 -C "2956529037@qq.com" -f C:\Users\29565\.ssh\id_ed25519
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

**成功输出：**
```
Your identification has been saved in C:\Users\29565\.ssh\id_ed25519
Your public key has been saved in C:\Users\29565\.ssh\id_ed25519.pub
The key fingerprint is:
SHA256:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX your_email@example.com
The key's randomart image is:
+--[ED25519 256]--+
|                 |
|        ...      |
|       . o .     |
|      . + =      |
|     . * S       |
|    . + .        |
|   . o           |
|  . .            |
| . .             |
+----[SHA256]-----+
```

### 2.3 查看生成的公钥内容

```powershell
Get-Content C:\Users\<你的用户名>\.ssh\id_ed25519.pub
```

**输出示例：**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINJSm4Njn8xY8jQh6c8E/gU6Lk7Q3gLMS2vH8U5tsASC 2956529037@qq.com
```

**复制这个完整的公钥内容**，下一步需要添加到 GitHub

---

## 三、将 SSH 公钥添加到 GitHub

### 3.1 登录 GitHub 账户

访问：https://github.com/login

### 3.2 进入 SSH 密钥设置页面

1. 点击右上角头像 → **Settings**
2. 左侧菜单选择 **SSH and GPG keys**
3. 点击 **New SSH key** 按钮

### 3.3 添加新密钥

**填写信息：**
- **Title**: 给密钥起个名字，如 "Workstation-2026" 或 "Home-PC"
- **Key type**: 选择 **Authentication Key**
- **Key**: 粘贴刚才复制的公钥内容

**示例：**
```
Title: Home Desktop PC
Key: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINJSm4Njn8xY8jQh6c8E/gU6Lk7Q3gLMS2vH8U5tsASC 2956529037@qq.com
```

点击 **Add SSH key** 保存。

---

## 四、配置 Git 使用 SSH 密钥

### 4.1 配置 Git 使用指定的 SSH 密钥

```powershell
git config --global core.sshCommand "ssh -i C:/Users/<你的用户名>/.ssh/id_ed25519"
```

**实际操作示例：**
```powershell
git config --global core.sshCommand "ssh -i C:/Users/29565/.ssh/id_ed25519"
```

**注意事项：**
- 路径使用正斜杠 `/` 而不是反斜杠 `\`
- 确保路径与实际密钥位置一致

### 4.2 验证配置

```powershell
git config --global --list | Select-String -Pattern "ssh"
```

**成功输出：**
```
core.sshcommand=ssh -i C:/Users/29565/.ssh/id_ed25519
```

---

## 五、首次连接 GitHub 并添加主机密钥

### 5.1 测试 SSH 连接

```powershell
ssh -T git@github.com
```

**首次连接时的提示：**
```
The authenticity of host 'github.com (20.205.243.166)' can't be established.
ED25519 key fingerprint is SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU.
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

**输入：** `yes` 然后按回车

**成功输出：**
```
Warning: Permanently added 'github.com' (ED25519) to the list of known hosts.
Hi <你的 GitHub 用户名>! You've successfully authenticated, but GitHub does not provide shell access.
```

### 5.2 自动添加主机密钥（可选）

如果想跳过确认步骤，可以使用：

```powershell
ssh -o StrictHostKeyChecking=no git@github.com
```

这会自动将 GitHub 添加到已知主机列表。

---

## 六、验证 SSH 连接

### 6.1 完整测试连接

```powershell
ssh -T git@github.com
```

**成功标志：**
```
Hi <username>! You've successfully authenticated, but GitHub does not provide shell access.
```

**常见错误及解决：**

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| Permission denied (publickey) | 公钥未添加到 GitHub 或密钥不匹配 | 检查 GitHub 上的 SSH 密钥是否正确粘贴 |
| Could not resolve hostname github.com | DNS 问题 | 检查网络连接 |
| Connection timed out | 网络被防火墙阻止 | 检查防火墙设置或使用代理 |

---

## 七、使用 SSH 进行 Git 操作

### 7.1 克隆仓库

**使用 SSH URL：**
```powershell
git clone git@github.com:<username>/<repository>.git
```

**示例：**
```powershell
git clone git@github.com:creator-chb/StudyHub.git
```

### 7.2 修改现有仓库的远程地址

如果仓库之前使用 HTTPS，需要改为 SSH：

```powershell
cd <仓库目录>
git remote set-url origin git@github.com:<username>/<repository>.git
```

**验证远程地址：**
```powershell
git remote -v
```

**输出示例：**
```
origin  git@github.com:creator-chb/StudyHub.git (fetch)
origin  git@github.com:creator-chb/StudyHub.git (push)
```

### 7.3 推送代码

```powershell
git push origin main
```

**成功标志：**
- 不再需要输入用户名和密码
- 使用 SSH 密钥自动认证

### 7.4 拉取代码

```powershell
git pull origin main
```

---

## 八、高级配置与优化

### 8.1 配置 SSH 配置文件（可选）

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

### 8.2 启动 ssh-agent 服务（可选）

如果希望系统自动管理密钥，可以启动 ssh-agent：

**以管理员身份运行 PowerShell：**

```powershell
# 设置服务为手动启动
Set-Service -Name ssh-agent -StartupType Manual

# 启动服务
Start-Service ssh-agent

# 添加密钥到 agent
ssh-add C:\Users\<你的用户名>\.ssh\id_ed25519
```

**注意：** 启动 ssh-agent 服务需要管理员权限，普通用户建议使用 `git config core.sshCommand` 方式即可。

### 8.3 配置多个 SSH 密钥

如果有多个 GitHub 账户，可以：

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

3. 使用不同的远程地址：
```powershell
# 个人项目
git remote set-url origin git@github-personal:username/repo.git

# 工作项目
git remote set-url origin git@github-work:company/repo.git
```

---

## 九、故障排查

### 9.1 检查 SSH 连接

```powershell
ssh -vT git@github.com
```

`-v` 参数显示详细调试信息，帮助定位问题。

### 9.2 常见问题及解决方案

#### 问题 1：Permission denied (publickey)

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

#### 问题 2：ssh-add 报错 "Error connecting to agent"

**原因：** ssh-agent 服务未运行

**解决方案 1（推荐）：** 使用 `git config core.sshCommand` 绕过 ssh-agent

**解决方案 2：** 以管理员身份启动 ssh-agent 服务（见 8.2 节）

#### 问题 3：Known hosts 验证失败

**解决方案：**
```powershell
# 删除旧的 known_hosts 记录
Remove-Item C:\Users\<用户名>\.ssh\known_hosts

# 重新连接
ssh -T git@github.com
```

#### 问题 4：密钥文件不存在

**解决方案：**
```powershell
# 检查密钥文件是否存在
Test-Path C:\Users\<用户名>\.ssh\id_ed25519

# 如果不存在，重新生成
ssh-keygen -t ed25519 -C "your_email@example.com" -f C:\Users\<用户名>\.ssh\id_ed25519
```

---

## 十、安全建议

### 10.1 密钥备份

**备份私钥和公钥：**
```powershell
Copy-Item C:\Users\<用户名>\.ssh\id_ed25519 D:\Backup\ssh\
Copy-Item C:\Users\<用户名>\.ssh\id_ed25519.pub D:\Backup\ssh\
```

### 10.2 设置密钥密码

生成密钥时设置密码短语：
```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
# 在提示时输入密码短语
```

### 10.3 定期轮换密钥

建议每 6-12 个月更换一次 SSH 密钥：

1. 生成新密钥
2. 添加到 GitHub
3. 删除旧密钥
4. 更新 Git 配置

---

## 十一、快速配置清单

✅ **配置检查清单：**

- [ ] 生成 SSH 密钥对
- [ ] 复制公钥内容
- [ ] 在 GitHub 上添加 SSH 密钥
- [ ] 配置 `git config core.sshCommand`
- [ ] 首次连接 GitHub 确认主机密钥
- [ ] 测试 `ssh -T git@github.com`
- [ ] 克隆或推送测试仓库

---

## 十二、常用命令速查

```powershell
# 生成密钥
ssh-keygen -t ed25519 -C "email@example.com" -f C:\Users\用户名\.ssh\id_ed25519

# 查看公钥
Get-Content C:\Users\用户名\.ssh\id_ed25519.pub

# 配置 Git 使用 SSH
git config --global core.sshCommand "ssh -i C:/Users/用户名/.ssh/id_ed25519"

# 测试连接
ssh -T git@github.com

# 检查配置
git config --global --list | Select-String -Pattern "ssh"

# 修改远程仓库为 SSH
git remote set-url origin git@github.com:username/repo.git

# 验证远程地址
git remote -v
```

---

## 附录：GitHub SSH 密钥指纹

官方 GitHub SSH 密钥指纹（用于验证）：

- **RSA**: `SHA256:nThbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY8`
- **ECDSA**: `SHA256:p2QAMXNIC1TJYWeIOttrVc98/R1BUFWu3/LiyKgUfQM`
- **ED25519**: `SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU`

来源：https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints

---

**文档版本：** 1.0  
**最后更新：** 2026-03-19  
**适用环境：** Windows PowerShell + Git Bash
