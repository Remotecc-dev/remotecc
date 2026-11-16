---
title: Claude Code on iPhone — use Claude Code from your phone
description: Use Claude Code from your iPhone or Android phone. Sessions run on your own Mac or PC; your phone is a touch-friendly remote, end-to-end encrypted. Free and open source.
---
# Claude Code on your iPhone

Claude Code is a terminal tool, and phones are bad terminals. RemoteCC gives you a **phone-friendly interface for
Claude Code** while the work still happens on your own computer — your repos, your tools, your Claude plan.

## Set it up (2 minutes)
1. On your Mac (or Linux / Windows-WSL2 machine) with Claude Code installed, run:
   ```bash
   curl -fsSL https://remotecc.dev/install.sh | bash
   ```
2. On the computer, show a pairing QR code: menu bar icon → "Pair a phone or browser…", or run `remotecc pair`.
3. Point the iPhone Camera at the code and open the remotecc.dev link. Tap "Connect". Done.

Works in Safari and Chrome on iPhone and Android. Add remotecc.dev to your home screen for an app-like window.

## What it's like on the phone
- A chat view of every Claude Code session on your computer, updating live.
- Answer Claude's questions with one tap — or by raising fingers or nodding, if you like.
- See plan limits left, the session's token use and cost, and your computer's RAM, CPU temperature and disk.
- Send photos and files to the session; open what Claude makes.
- Start new sessions in any project, split child sessions, ask side questions with **btw**.

## Private by design
Your phone and your computer talk end-to-end encrypted (X25519 + AES-256-GCM). The relay that connects them when they
are on different networks only forwards ciphertext. On the same Wi-Fi or Tailscale they connect directly.
Nothing is stored in the cloud, and there is no account. Details: [security](/security).

## FAQ
**Do I need to leave my computer on?** Yes — Claude Code runs there. RemoteCC shows when it's offline.

**Does it work over mobile data?** Yes, through the relay. No port forwarding or VPN needed.

**Can I use it on iPad or Android?** Yes, any modern browser.
