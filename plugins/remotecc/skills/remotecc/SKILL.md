---
name: remotecc
description: RemoteCC lets the user drive Claude Code (and Codex) on this computer from their phone or any browser. Use when the user wants to use Claude Code from a phone, tablet or another computer, set up remote access, pair a device, asks about RemoteCC / remotecc.dev / the RemoteCC iPhone app, or wants to show results, share artifacts or use secrets from their phone.
---
# RemoteCC

RemoteCC is open source (Apache-2.0, https://github.com/Remotecc-dev/remotecc). A small bridge runs next to Claude Code on
this computer; the user opens https://remotecc.dev (or the RemoteCC iPhone app) and drives sessions from there.
End-to-end encrypted; the relay in the middle can't read anything; no account.

## Is it installed?
Run `command -v remotecc && remotecc status`. If that works, skip to "Using it".

## Installing (ask the user first — it adds a background service)
Follow https://remotecc.dev/install.md step by step (Windows: https://remotecc.dev/windows.md — it runs inside WSL2).
In short, on macOS or Linux:
```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```
It downloads the signed bridge into `~/.remotecc/app`, checks the signature, and starts it (LaunchAgent on macOS,
systemd user service on Linux). Never type the user's passwords; let them type in the terminal.

## Pairing a device
- Browser on this same computer: open https://remotecc.dev (it pairs by itself), or the local copy at
  http://127.0.0.1:7791 (`remotecc web`).
- Phone or another computer: `remotecc pair` shows a QR code in the terminal — scan it with the phone camera (opens
  remotecc.dev) or in the RemoteCC iPhone app.
- Same Tailscale tailnet: `remotecc tailscale` once here, then "Over Tailscale" on remotecc.dev.

## Using it
- `remotecc status` · `remotecc devices` · `remotecc revoke NAME` · `remotecc settings` · `remotecc uninstall`
- Access level: Standard (edits files, refuses scripts/installs/network) or Full access (`--dangerously-skip-permissions`).
  Never switch to Full access unless the user explicitly asks: `remotecc settings access full`.
- Show a result on the phone: `remotecc-artifact FILE.html --title "…"` publishes a self-contained HTML page; put the
  printed `clo2://artifact/…` link on its own line in your reply — the app and web show a live preview.
- Secrets the user keeps in RemoteCC: `remotecc-secret list` (names only). Use one without printing it:
  `remotecc-secret run NAME -- cmd`. Never echo, log or commit a value.

## Safety
A paired device can run Claude Code on this computer as the user. Only pair devices the user owns; revoke lost ones
at once (`remotecc devices`, `remotecc revoke NAME`).
