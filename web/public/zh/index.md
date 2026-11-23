# RemoteCC：远程控制你的编程 Agent

在自己的电脑上运行 Claude Code、Codex（使用你的 ChatGPT 套餐）和 Gemini（Google Antigravity 的 agy），用手机、平板或任意浏览器远程操控。端到端加密，无需注册账号，数据不存云端。免费且开源（Apache-2.0）。

## 核心功能
- **一个遥控器掌控所有 Agent**：支持 Claude Code、Codex 和 Gemini。实时启动、查看并回复会话：输出、工具调用、文件和图片全部呈现在清爽的聊天界面中。
- **顶级模型，会话中随时切换**：支持 Claude Opus 5.5 与 Fable 5.2、GPT-6 Astra 与 GPT-5.6、Gemini 4 Neon、Gemini 4 Carbon 与 Gemini 3.8 Flash，并可自选推理强度。
- **Claude 用量一目了然**：直观查看 5 小时和每周额度余量及重置时间，以及每次会话的 Token 消耗与费用。
- **电脑运行状态**：实时掌握运行 Claude Code 的机器的内存占用、CPU 温度与可用磁盘空间。
- **多任务并行**：支持子会话与分支，使用 **btw** 随时旁白提问，点头或举起手指即可回应。
- **隐私优先设计**：端到端加密（X25519 + AES-256-GCM）、盲中继转发、签名发布。代码和对话始终留在你自己的电脑上。
- **支持 macOS、Linux、Windows**：一条命令完成安装。Windows 通过 WSL2 运行。

## 一分钟安装
最简单的方式：把下面这段话直接粘贴到当前的 Claude Code 会话中，让它帮你装好 RemoteCC：

```
请按照 https://remotecc.dev/install.md 在这台电脑上安装 RemoteCC，然后告诉我如何配对。
```

或者在运行 Claude Code 的电脑终端中自行执行：

```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```

安装完成后，RemoteCC 会在该电脑后台运行（不会出现在菜单栏或程序坞中）。分步指南：[安装 RemoteCC](install)。

## 配对手机或浏览器
- **本机浏览器：**打开 [remotecc.dev](https://remotecc.dev/)，会自动完成配对。
- **手机或其他电脑：**在该电脑的终端运行 `remotecc pair`，再用手机相机扫描二维码。
- **iPhone 与 iPad 应用：**[在 App Store 下载 RemoteCC](https://apps.apple.com/app/id6797019430)。

Web 应用的界面为英文；当然，你与 Claude 的会话完全取决于你使用的语言。

## 常见问题
**我的代码或对话会经过服务器吗？** 不会。你的设备与电脑之间全程端到端加密。负责连接的中继仅转发密文，不存储任何内容；在同一 Wi-Fi 或 Tailscale 下会直接连接。

**RemoteCC 免费吗？** 是的。桥接程序、Web 应用和中继均免费开源。你继续使用自己的订阅套餐即可：Claude Code 使用 Claude、Codex 使用 ChatGPT、Gemini 使用 Google。

**需要注册账号吗？** 不需要。将浏览器与电脑配对即可使用。

**支持哪些电脑？** macOS、Linux，以及通过 WSL2 运行的 Windows。该电脑需至少安装并登录一个 Agent（Claude Code、Codex 或 agy）。

**这是 Anthropic 官方出品的吗？** 不是。RemoteCC 是独立的开源项目。Claude 和 Claude Code 是 Anthropic 的商标。

---
RemoteCC · https://remotecc.dev/zh/ · open source: https://github.com/Remotecc-dev/remotecc
