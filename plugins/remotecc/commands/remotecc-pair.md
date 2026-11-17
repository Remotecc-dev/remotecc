---
description: Pair your phone or another browser with this computer's Claude Code through RemoteCC (installs RemoteCC first if needed)
---
Help me use Claude Code on this computer from my phone or another browser with RemoteCC.

1. Check whether RemoteCC is installed: `command -v remotecc && remotecc status`.
2. If it isn't, explain in one or two sentences what installing does (a signed background bridge in `~/.remotecc`,
   open source at https://github.com/Remotecc-dev/remotecc), ask me to confirm, then follow https://remotecc.dev/install.md.
3. Then tell me how to pair: on this computer open https://remotecc.dev (pairs by itself); for a phone, I should run
   `remotecc pair` in my own terminal (it shows a QR code and waits) and scan it with the phone camera or the
   RemoteCC app. Don't run `remotecc pair` yourself — it waits for a scan.
