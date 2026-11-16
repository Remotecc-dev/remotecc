# RemoteCC for Claude Code

RemoteCC is a remote control for the **Claude Code CLI** running on your own Mac, Linux box or Windows (WSL2) PC.
Your projects, tools and Claude plan stay where they are; you follow and steer every session from
[remotecc.dev](https://remotecc.dev), the local web app, or the AI Code Remote iPhone app.

## What works with Claude Code
- **Every session on the computer**, live: what each one is doing, its transcript, tool calls and files.
- **Start new sessions** in any project folder, continue old ones, stop a running turn.
- **Plan usage left** for your Claude plan (5-hour and weekly windows, reset times), tokens and cost per session.
- **Child sessions and branches** to work in parallel; **btw** side questions that don't derail the main task.
- **Files and images** to and from the session; **artifacts** (HTML pages Claude makes) open on the phone.
- **Secrets** encrypted for your computer, usable by Claude without being printed.
- **Access level** per computer: Standard (`--permission-mode acceptEdits`) or Full access.
- A **Claude Code plugin** that teaches Claude to install and use RemoteCC:
  ```
  /plugin marketplace add Remotecc-dev/remotecc
  /plugin install remotecc@remotecc
  ```
  Then ask Claude: "set up RemoteCC so I can use this from my phone".

## Set up
```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```
Open [remotecc.dev](https://remotecc.dev) on that computer (it pairs by itself), or run `remotecc pair` and scan the QR
code with your phone. Details: [install guide](/install.md) · [Windows](/windows) · [Tailscale](/claude-code-over-tailscale).

## Also works with
[Codex](/codex) — the same remote for OpenAI's Codex CLI, side by side with Claude Code.

---
RemoteCC · https://remotecc.dev/claude-code · open source: https://github.com/Remotecc-dev/remotecc
