---
title: Install RemoteCC — use Claude Code from your phone or any browser
description: Install RemoteCC on macOS, Linux or Windows (WSL2) with one command, then pair your phone or browser. Signed releases, end-to-end encrypted.
---
# Install RemoteCC

RemoteCC lets you use Claude Code on your computer from any browser or the iPhone app. The connection is end-to-end encrypted, and nothing is stored in the cloud.

RemoteCC is **open source (Apache-2.0)**: [github.com/Remotecc-dev/remotecc](https://github.com/Remotecc-dev/remotecc). You can read the installer and the bridge there before running anything. Every release is signed, and the installer refuses files whose signature doesn't match.

## Requirements
- macOS, Linux, or Windows with WSL2 (see "On Windows" below).
- Claude Code installed and signed in on this computer (`claude --version` works).
- Python 3 (macOS: `xcode-select --install` · Ubuntu: `sudo apt install python3 python3-venv`).

## 1. Install
Run this in a terminal on the computer that runs Claude Code:

```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```

What it does:
- downloads the signed bridge into `~/.remotecc/app` and checks the signature;
- creates a private Python environment;
- starts the bridge in the background (a LaunchAgent on macOS, a systemd user service on Linux and WSL). You manage it with the `remotecc` command.

It ends with `RemoteCC running` and a **Next step** block.

Prefer to let Claude do it? Paste this into Claude Code: `Install RemoteCC on this computer by following https://remotecc.dev/install.md, then tell me how to pair.`

## 2. Pair a browser or phone
- **Browser on this computer:** open [remotecc.dev](https://remotecc.dev/), or refresh it if it's already open. It pairs with this computer by itself. In Safari, click "Connect RemoteCC on this Mac" once.
- **Phone or another computer:** run `remotecc pair` in a terminal on this computer. A QR code appears. Scan it with the iPhone Camera, or with "Scan QR code" on remotecc.dev.
- **Another computer on the same Tailscale tailnet:** open remotecc.dev there, choose "Over Tailscale", pick this computer, then type the 4-digit code from that page into the RemoteCC dialog on this computer.

## On Windows
RemoteCC runs inside WSL2 (Ubuntu):
1. In PowerShell: `wsl --install -d Ubuntu`, then open Ubuntu.
2. Install Claude Code inside Ubuntu and sign in.
3. In Ubuntu, run the install command above.

When it's done, your Windows browser opens remotecc.dev already paired. Full guide (English): [Windows guide](/windows).

## Useful commands
`remotecc status` · `remotecc devices` · `remotecc settings` · `remotecc uninstall`

Updates install automatically (signed by RemoteCC) when no task is running. Turn that off with `remotecc settings auto-update off`.
