# Claude Code remote control

Claude Code works best on your own computer: your repos, your tools, your keys. RemoteCC lets you **keep it there and
drive it from anywhere** — your phone, a tablet, another laptop — through a clean web interface at
[remotecc.dev](https://remotecc.dev).

## What you can do remotely
- **Start, watch and answer sessions live.** Streaming output, tool calls, questions and files, in one chat view.
- **Run several sessions in parallel.** Split a child session for a side task, branch a conversation, or ask a quick
  side question with **btw** without derailing the main task.
- **See your Claude usage.** Plan limits left in the 5-hour and weekly windows with reset times, plus tokens and cost per session.
- **Watch your machine.** RAM in use, CPU temperature and free disk space of the computer running Claude Code.
- **Send files and images**, open artifacts Claude makes, and keep secrets encrypted for your computer.
- **Answer hands-free** with a nod, a head shake or raised fingers (optional camera gestures).

## How it works in one minute
1. Install the bridge on the computer that runs Claude Code:
   ```bash
   curl -fsSL https://remotecc.dev/install.sh | bash
   ```
2. Open [remotecc.dev](https://remotecc.dev) on that computer (it pairs by itself) or scan the QR code from your phone.
3. Pick a project and send a message. Claude Code runs on your computer; you see it live.

Everything between your device and your computer is end-to-end encrypted. The relay in the middle forwards
ciphertext and keeps nothing. See [how it works](/how-it-works) and [security](/security).

## RemoteCC compared with other ways
| | RemoteCC | SSH + tmux | Cloud coding agents |
|---|---|---|---|
| Where code runs | Your computer | Your computer | A cloud sandbox |
| Phone experience | Chat UI made for touch | Terminal on a small screen | Chat UI |
| Network setup | None (relay), or direct over Wi-Fi / Tailscale | Port forwarding or VPN | None |
| Your local tools, keys, repos | Yes | Yes | Only what you upload |
| Account needed | No | No | Yes |
| Open source | Yes (Apache-2.0) | Yes | Usually not |

Anthropic also offers ways to continue sessions from its own apps. RemoteCC is independent and open source,
and focuses on running many sessions on your own machine with usage and machine-health views.

## FAQ
**Is it free?** Yes. The bridge, the web app and the relay are free and open source.

**Does RemoteCC see my code?** No. Messages are end-to-end encrypted between your device and your computer.

**Which systems?** macOS, Linux, and Windows through [WSL2](/windows).

---
RemoteCC · https://remotecc.dev/claude-code-remote-control · open source: https://github.com/Remotecc-dev/remotecc
