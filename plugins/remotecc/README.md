# RemoteCC plugin for Claude Code

Use Claude Code on this computer from your phone or any browser. This plugin teaches Claude how to install, pair and
use [RemoteCC](https://remotecc.dev) — an open-source (Apache-2.0) bridge and web app: end-to-end encrypted, blind
relay, no account. Works with Claude Code and Codex on macOS, Linux and Windows (WSL2).

## Install

```
/plugin install remotecc --marketplace Remotecc-dev/remotecc
```

Older Claude Code: `/plugin marketplace add Remotecc-dev/remotecc`, then `/plugin install remotecc@remotecc`.

## What's inside
- **Skill `remotecc`** — Claude knows how to install RemoteCC (after asking you), pair a phone or browser, publish
  artifacts to your phone and use secrets without printing them.
- **Command `/remotecc-pair`** — installs RemoteCC if needed and walks you through pairing a device.

## Data handling
The plugin itself sends nothing anywhere and stores nothing. It only gives Claude instructions. Installing RemoteCC
(only after you confirm) runs the signed installer from https://remotecc.dev/install.sh; RemoteCC's own data stays in
`~/.remotecc` on your computer. Privacy: https://remotecc.dev/privacy

## Source
https://github.com/Remotecc-dev/remotecc · support@remotecc.dev
