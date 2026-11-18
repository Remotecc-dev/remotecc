# How RemoteCC works

```
 browser / phone  <==  end-to-end encrypted  ==>  bridge  ->  claude (Claude Code CLI)
        |                                            |
        +----------->  relay.remotecc.dev  <---------+      (blind: forwards ciphertext, keeps no messages)
               (or direct over your LAN / Tailscale, still encrypted)
```

## The three parts
- **The bridge** (Python) runs on your computer next to Claude Code. It owns your data in `~/.remotecc`, starts
  `claude` for each turn and reports what each session is doing.
- **The web app** is static files served from remotecc.dev — or from the bridge itself at `http://127.0.0.1:7791`.
  It holds only a pairing key in your browser.
- **The relay** (a Cloudflare Worker) connects your device and your computer when they are on different networks.
  It never has a key and stores no messages. On the same Wi-Fi or Tailscale, devices connect directly.

## Pairing
Your computer shows a QR code or a pairing link that expires within minutes. Your device and the computer agree on keys
with X25519, and each new device is confirmed with a 4-digit code on the computer (a browser on the same computer is
approved by itself). Paired devices can be revoked at any time with `remotecc devices` and `remotecc revoke NAME`.

## Updates
The bridge checks remotecc.dev about once an hour and installs only releases signed with the RemoteCC release key, when
no task is running. A release that fails to start is rolled back automatically.

## Open source
All of it — bridge, web app, relay, installer — is on GitHub under Apache-2.0:
[github.com/Remotecc-dev/remotecc](https://github.com/Remotecc-dev/remotecc). See also [security](/security).

---
RemoteCC · https://remotecc.dev/how-it-works · open source: https://github.com/Remotecc-dev/remotecc
