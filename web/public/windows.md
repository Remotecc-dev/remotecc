# RemoteCC on Windows (WSL2)

RemoteCC's bridge runs inside **WSL2** (Ubuntu on Windows), next to **Claude Code installed inside that same Ubuntu**.
Your browser (and later your phone) then drives Claude Code on this PC, end-to-end encrypted, the same way it does on a Mac.

RemoteCC is **open source (Apache-2.0)**: https://github.com/Remotecc-dev/remotecc. You can read the installer and the bridge
there before running anything. Releases are signed, and the installer refuses anything else.

> **For Claude Code / AI agents reading this:** run the steps in order. Commands marked *PowerShell* run on Windows.
> Commands marked *Ubuntu* run inside WSL; from Windows you can run them with `wsl -d Ubuntu -- bash -lc '<command>'`.
> Steps 1 and 4 can need an admin prompt or a reboot, so ask the user before you run them. Never type the user's
> passwords yourself. Let them type them in the terminal.

## Requirements
- Windows 10 22H2 or Windows 11, with virtualization enabled (default on most PCs).
- A Claude subscription or API key for Claude Code.

## 1. Install WSL2 with Ubuntu (*PowerShell, as administrator*)
```powershell
wsl --install -d Ubuntu
```
Restart Windows if asked. Open **Ubuntu** from the Start menu and create a Linux username and password.
Already have WSL? Check it is version 2: `wsl -l -v`. If it shows 1, run `wsl --set-version Ubuntu 2`.

## 2. Basic tools (*Ubuntu*)
```bash
sudo apt update && sudo apt install -y python3 python3-venv curl git
```

## 3. Claude Code inside Ubuntu (*Ubuntu*)
The Windows copy of Claude Code is not visible from WSL, so install it here too:
```bash
curl -fsSL https://claude.ai/install.sh | bash
claude        # sign in once, then exit with /exit
```

## 4. Turn on systemd (*Ubuntu*, once)
The bridge is a systemd user service. The installer offers to do this step for you. To do it by hand:
```bash
printf '\n[boot]\nsystemd=true\n' | sudo tee -a /etc/wsl.conf
```
Then in *PowerShell*: `wsl --shutdown`, and open Ubuntu again.

## 5. Install RemoteCC (*Ubuntu*)
```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```
The installer:
- asks where devices may pair from and what Claude may do;
- starts the `remotecc-bridge` service;
- adds a hidden helper to the Windows Startup folder (`remotecc-wsl.vbs`) that keeps WSL running after you close the Ubuntu window. Without it, Windows stops WSL a few seconds after the last window closes, and the bridge with it.

## 6. Open RemoteCC in your browser (*Windows*)
When the installer finishes, it opens **http://127.0.0.1:7790/web** in your Windows browser. That page sends you to
https://remotecc.dev already paired with this PC: no QR code, no code to type. If it didn't open, open that address
yourself in Edge or Chrome **on this PC**. On https://remotecc.dev you can also click "Connect RemoteCC on this Mac":
it works the same on Windows.

Check the bridge (*Ubuntu*):
```bash
remotecc status     # bridge, settings and paired devices
```
Phone (iPhone app) or another computer: `remotecc pair` shows a QR code and a link.

## Keep it running
- The bridge starts with WSL. The Startup helper starts WSL at every Windows login.
- Check it with `remotecc status`. Restart it with `systemctl --user restart remotecc-bridge`.
- No helper (for example, Windows interop is turned off)? Leave an Ubuntu window open, or add a Windows Task Scheduler task "At log on" that runs `wsl.exe -d Ubuntu --exec sleep infinity`.

## Connections
- **Anywhere:** works out of the box through the encrypted relay.
- **Same Wi-Fi (direct):** WSL sits behind a virtual network by default. On Windows 11 22H2+, add this to `%UserProfile%\.wslconfig` (*Windows*), then run `wsl --shutdown`:
  ```ini
  [wsl2]
  networkingMode=mirrored
  ```
  Allow Python through Windows Firewall when asked.
- **Tailscale:** install Tailscale on Windows. With mirrored networking, the bridge is reachable on the PC's Tailscale address.

## Your projects
Keep code inside Ubuntu (for example `~/code`). Files under `/mnt/c/...` work, but are much slower for Claude Code and git.
The app's folder picker lists git repos in your Ubuntu home folder.

## Updates and removal
- Updates install automatically. Turn them off with `remotecc settings auto-update off`.
- To remove RemoteCC: `bash ~/.remotecc/app/install.sh uninstall`. This also removes the Startup helper. Your data stays in `~/.remotecc`; delete that folder to wipe it.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Installer says "running without systemd" | Do step 4, run `wsl --shutdown`, reopen Ubuntu, then run the installer again. |
| Phone shows the PC as offline | Run `remotecc status` in Ubuntu. Check that `remotecc-wsl.vbs` is in `shell:startup`. Run `wsl -l -v` in PowerShell: Ubuntu should be "Running". |
| "claude isn't installed" | Do step 3 inside Ubuntu. The Windows copy doesn't count. |
| Same-Wi-Fi pairing fails | Use mirrored networking (above), or pair over the relay, which works from anywhere. |
| Logs | `~/.remotecc/bridge.log` |

Support: support@remotecc.dev
