# Claude Code in your browser

RemoteCC is a **web UI for the Claude Code CLI that keeps running on your own computer**. Open
[remotecc.dev](https://remotecc.dev) in any browser — on the same computer or another one — and work with all your
Claude Code sessions in a readable chat view.

## Two ways to open it
| | Address | Best for |
|---|---|---|
| Hosted | [remotecc.dev](https://remotecc.dev) | Phones, tablets, other computers |
| Local | `http://127.0.0.1:7791` (served by the bridge itself) | The same computer, no dependency on remotecc.dev |

The local copy is the same code, taken from the signed release your bridge installed. Open it with `remotecc web`.

## Why a browser instead of the terminal
- Long answers, diffs and tables are easier to read; images and files show inline.
- Every session on the machine in one list, with what each one is doing right now.
- Usage at a glance: plan limits left, tokens and cost per session.
- Machine health: RAM, CPU temperature, free disk.
- Pick up the same session later from your phone.

## Install
```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```
Then open [remotecc.dev](https://remotecc.dev) on that computer — it pairs by itself. More: [install guide](/install.md).

---
RemoteCC · https://remotecc.dev/claude-code-from-browser · open source: https://github.com/Remotecc-dev/remotecc
