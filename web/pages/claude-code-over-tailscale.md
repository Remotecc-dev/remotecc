---
title: Claude Code over Tailscale — direct, private access to your sessions
description: Reach Claude Code on your computer directly over your Tailscale tailnet from the RemoteCC web app. No relay in the path, still end-to-end encrypted.
---
# Claude Code over Tailscale

If your devices are on a [Tailscale](https://tailscale.com) tailnet, RemoteCC can connect **directly** to the
computer running Claude Code — no relay in the path — and it is still end-to-end encrypted on top of Tailscale.

## Set it up
1. Install RemoteCC on the computer that runs Claude Code:
   ```bash
   curl -fsSL https://remotecc.dev/install.sh | bash
   ```
2. On that computer, run once in a terminal:
   ```bash
   remotecc tailscale
   ```
   It sets up `tailscale serve` on port 8444 so browsers on your tailnet can reach the bridge over HTTPS.
3. On another device on the same tailnet, open [remotecc.dev](https://remotecc.dev), choose **Over Tailscale**, pick the
   computer (or type its name, like `my-computer.tailxxxx.ts.net`) and tap **Pair**.
4. Type the 4-digit code shown on the page into the RemoteCC dialog on the computer.

Once one computer is paired, your other computers on the tailnet running RemoteCC show up in the list.

## Notes
- Turn on "Use Tailscale DNS" in the Tailscale app if the name doesn't resolve.
- Phones on the same Wi-Fi can also connect directly without Tailscale.
- Away from both, RemoteCC falls back to the encrypted relay.
