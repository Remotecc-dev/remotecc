# Install RemoteCC

RemoteCC lets you use Claude Code on this computer from any browser or the iPhone app. The connection is end-to-end
encrypted, and nothing is stored in the cloud.

RemoteCC is **open source (Apache-2.0)**: https://github.com/Remotecc-dev/remotecc. You can read the installer
(`web/public/install.sh`) and the bridge (`bridge/`) there before running anything. Every release is signed, and the
installer refuses files whose signature doesn't match. `verify-release.sh` in the repo checks a release by hand.

> **For Claude Code / AI agents reading this:** do the steps in order and tell the user what each one does.
> Never type the user's passwords yourself. Let them type them in the terminal.

## Requirements
- macOS, Linux, or Windows with WSL2 (Windows: follow https://remotecc.dev/windows.md instead).
- Claude Code installed and signed in on this computer (`claude --version` works).
- Python 3 (macOS: `xcode-select --install` · Ubuntu: `sudo apt install python3 python3-venv`).

## 1. Install
```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```
What it does:
- downloads the signed bridge into `~/.remotecc/app` and checks the signature;
- creates a private Python environment;
- starts the bridge as a LaunchAgent on macOS, or as a systemd user service on Linux/WSL (no menu bar icon: you
  manage it with the `remotecc` command).

It ends with `RemoteCC running` and a **Next step** block.

## 2. Pair a browser or phone
Tell the user one of these:
- **Browser on this computer:** open https://remotecc.dev, or refresh it if it's already open. It pairs with this
  computer by itself. In Safari, click "Connect RemoteCC on this Mac" once.
- **Phone or another computer:** run `remotecc pair` in a Terminal window on this computer. A QR code appears. Scan it
  with the iPhone Camera, or with "Scan QR code" on remotecc.dev.
- **Another computer on the same Tailscale tailnet:** open remotecc.dev there, choose "Over Tailscale", pick this
  computer, then type the 4-digit code from that page into the RemoteCC dialog that opens on this computer.

## Useful commands
`remotecc status` · `remotecc devices` · `remotecc settings` · `remotecc uninstall`

Updates install automatically (signed by RemoteCC) when no task is running.
Turn that off with `remotecc settings auto-update off`.
