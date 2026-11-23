# RemoteCC for Gemini (agy)

RemoteCC drives **agy**, the command-line agent of Google Antigravity, on your own computer — next to Claude Code and
Codex. If `agy` is installed and signed in there, it appears as an agent in the RemoteCC web app and the iPhone app.

## What works with agy
- **Gemini models, switchable mid-session:** Gemini 4 Neon (default, medium effort), Gemini 4 Carbon and Gemini 3.8
  Flash, each with its effort levels. Change the model between two messages; the conversation carries on.
- **Start or continue sessions** from the phone in any project folder, with file edits and commands shown as they happen.
- **Access level:** Standard lets agy edit files in the project and refuses commands that need permission; Full access
  (`--dangerously-skip-permissions`) only when you choose it and the computer allows it.
- The same end-to-end encryption, pairing and devices as for Claude Code.

## Set up
1. Install Google Antigravity's `agy` CLI on the computer and sign in.
2. Install RemoteCC there:
   ```bash
   curl -fsSL https://remotecc.dev/install.sh | bash
   ```
3. Open [remotecc.dev](https://remotecc.dev) and pick **agy** when starting a session. In the iPhone app you can make it
   the default agent in Settings.

## Not yet
Side questions (**btw**) and child sessions are Claude Code features. Sessions you start with `agy` directly on the
computer don't show in RemoteCC yet.

## Also works with
[Claude Code](/claude-code) (Claude Opus 5.5, Fable 5.2) and [Codex](/codex) (GPT-6 Astra, GPT-5.6 with your ChatGPT plan).

---
RemoteCC · https://remotecc.dev/gemini · open source: https://github.com/Remotecc-dev/remotecc
