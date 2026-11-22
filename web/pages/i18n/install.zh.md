---
title: 安装 RemoteCC — 用手机或浏览器远程使用 Claude Code
description: 一条命令在 macOS、Linux 或 Windows (WSL2) 安装 RemoteCC，用手机或浏览器操控 Claude Code，端到端加密。
---
# 安装 RemoteCC

RemoteCC 让你通过任意浏览器或 iPhone 应用，远程使用电脑上的 Claude Code。连接全程端到端加密，不会在云端存储任何数据。

RemoteCC **开源（Apache-2.0）**：[github.com/Remotecc-dev/remotecc](https://github.com/Remotecc-dev/remotecc)。运行前你可以先查看安装脚本和桥接程序的源码。每个发布版本均经过签名，安装程序会拒绝签名不匹配的文件。

## 环境要求
- macOS、Linux，或启用了 WSL2 的 Windows（详见下方“在 Windows 上安装”）。
- 本机已安装并登录 Claude Code（`claude --version` 可正常运行）。
- Python 3（macOS：`xcode-select --install` · Ubuntu：`sudo apt install python3 python3-venv`）。

## 1. 安装
在运行 Claude Code 的电脑终端中执行：

```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```

它会完成以下操作：
- 将已签名的桥接程序下载到 `~/.remotecc/app` 并校验签名；
- 创建独立的 Python 虚拟环境；
- 在后台启动桥接服务（macOS 上为 LaunchAgent，Linux 和 WSL 上为 systemd 用户服务）。你可以通过 `remotecc` 命令管理它。

安装结束时会输出 `RemoteCC running` 和 **Next step** 提示块。

想直接让 Claude 帮你安装？把这句粘贴到 Claude Code 中：`请按照 https://remotecc.dev/install.md 在这台电脑上安装 RemoteCC，然后告诉我如何配对。`

## 2. 配对浏览器或手机
- **本机浏览器：**打开 [remotecc.dev](https://remotecc.dev/)，若已打开则刷新页面，它会自动与本机配对。在 Safari 中，首次需点击一次 "Connect RemoteCC on this Mac"（连接此 Mac 上的 RemoteCC）。
- **手机或其他电脑：**在本机终端运行 `remotecc pair`，会出现一个二维码。用 iPhone 相机扫描，或在 remotecc.dev 上使用 "Scan QR code"（扫描二维码）扫描。
- **同一 Tailscale tailnet 下的其他电脑：**在另一台电脑上打开 remotecc.dev，选择 "Over Tailscale"（通过 Tailscale），选中当前电脑，然后将该页面显示的 4 位数字验证码输入到本机的 RemoteCC 对话框中。

## 在 Windows 上安装
RemoteCC 在 WSL2（Ubuntu）内运行：
1. 在 PowerShell 中运行 `wsl --install -d Ubuntu`，然后打开 Ubuntu。
2. 在 Ubuntu 中安装并登录 Claude Code。
3. 在 Ubuntu 中运行上方的安装命令。

完成后，你的 Windows 浏览器会自动打开已配对好的 remotecc.dev。完整指南（英文）：[Windows 指南](/windows)。

## 常用命令
`remotecc status` · `remotecc devices` · `remotecc settings` · `remotecc uninstall`

在没有任务运行时，经 RemoteCC 签名的更新会自动安装。如需关闭，可运行 `remotecc settings auto-update off`。
