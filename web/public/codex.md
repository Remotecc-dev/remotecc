# RemoteCC for Codex

RemoteCC also drives the **OpenAI Codex CLI** on your own computer, next to Claude Code. If `codex` is installed and
signed in there, Codex appears as an agent in the RemoteCC web app and the iPhone app.

## What works with Codex
- **Your Codex sessions** (from `~/.codex/sessions`) listed and mirrored live, like Claude Code's.
- **Start or continue turns** from the phone (`codex exec` / `codex exec resume` in the session's folder), with commands,
  file edits, MCP tool calls and web searches shown as they happen.
- **Access level:** writes stay inside the project folder (`sandbox_mode="workspace-write"`), or Full access only when
  you choose it and the computer allows it.
- **Plan usage** for your ChatGPT plan shown next to Claude's.
- The same end-to-end encryption, pairing and devices as for Claude Code.

## Set up
1. Install and sign in to Codex on the computer: see OpenAI's Codex CLI docs.
2. Install RemoteCC there:
   ```bash
   curl -fsSL https://remotecc.dev/install.sh | bash
   ```
3. Open [remotecc.dev](https://remotecc.dev) and pick **Codex** when starting a session.

## Also works with
[Claude Code](/claude-code). More coding agents are on the roadmap — RemoteCC aims to be the remote control for every
coding agent that runs on your own machine.

---
RemoteCC · https://remotecc.dev/codex · open source: https://github.com/Remotecc-dev/remotecc
