---
title: RemoteCC — remote control for Claude Code, Codex (ChatGPT) and Gemini from your phone or any browser
description: RemoteCC lets you control Claude Code, Codex (ChatGPT) and Gemini (agy) sessions on your own computer from your phone or any browser. End-to-end encrypted, no account, free and open source.
---
# RemoteCC: the remote control for your coding agents

Run Claude Code, Codex (with your ChatGPT plan) and Gemini (Google Antigravity's agy) on your own computer, and drive them from your phone, tablet or any browser. End-to-end encrypted, no account, nothing stored in the cloud. Free and open source (Apache-2.0).

## What you get
- **One remote for every agent**: Claude Code, Codex and Gemini. Start, watch and answer sessions live: output, tool calls, files and images in one clean chat view.
- **The best models, switchable mid-session**: Claude Opus 5.5 and Fable 5.2, GPT-6 Astra and GPT-5.6, Gemini 4 Neon, Gemini 4 Carbon and Gemini 3.8 Flash, with the effort level you choose.
- **Claude usage at a glance**: plan limits left in the 5-hour and weekly windows with reset times, plus tokens and cost per session.
- **Your computer's health**: RAM in use, CPU temperature and free disk space of the machine running Claude Code.
- **Work in parallel**: child sessions and branches, side questions with **btw**, answer with a nod or a raised finger.
- **Private by design**: end-to-end encrypted (X25519 + AES-256-GCM), blind relay, signed releases. Code and chats stay on your own computer.
- **macOS, Linux, Windows**: one command to install. Windows runs it through WSL2.

## Install in one minute
The easiest way: paste this into your current Claude Code session and let it install RemoteCC for you:

```
Install RemoteCC on this computer by following https://remotecc.dev/install.md, then tell me how to pair.
```

Or run it yourself in a terminal on the computer that runs Claude Code:

```bash
curl -fsSL https://remotecc.dev/install.sh | bash
```

RemoteCC then runs in the background on that computer (nothing in the menu bar or the Dock). Step-by-step guide: [Install RemoteCC](install).

## Pair your phone or browser
- **Browser on the same computer:** open [remotecc.dev](https://remotecc.dev/). It pairs by itself.
- **Phone or another computer:** run `remotecc pair` in a terminal on that computer and scan the QR code with your phone's camera.
- **iPhone and iPad app:** [RemoteCC on the App Store](https://apps.apple.com/app/id6797019430).

The web app's interface is in English; your sessions, of course, are in whatever language you write to Claude.

## FAQ
**Does my code or chat go through a server?** No. Your device and your computer talk end-to-end encrypted. The relay that connects them only forwards ciphertext and stores nothing; on the same Wi-Fi or Tailscale they connect directly.

**Is RemoteCC free?** Yes. The bridge, the web app and the relay are free and open source. You use your own plans: Claude for Claude Code, ChatGPT for Codex, Google for Gemini.

**Do I need an account?** No. Pairing a browser with your computer is all it takes.

**Which computers does it run on?** macOS, Linux, and Windows through WSL2. At least one agent (Claude Code, Codex or agy) must be installed and signed in on that computer.

**Is it made by Anthropic?** No. RemoteCC is an independent open-source project. Claude and Claude Code are trademarks of Anthropic.
