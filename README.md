# RemoteCC

**The best interface for Claude Code — control your sessions remotely, at ease, from any browser.**
No account, nothing stored in the cloud, open source (Apache-2.0).

- **Remote control for Claude Code:** start, watch and answer Claude Code sessions on your computer from your phone,
  tablet or another laptop — live output, approvals, files and images, all in one clean chat view.
- **Know your limits:** Claude plan usage left (5-hour and weekly windows, with reset times), tokens and cost per session.
- **Watch your machine:** RAM in use, CPU temperature and free disk space of the computer running Claude Code.
- **Work in parallel:** split child sessions and branches, ask quick side questions with **btw** without derailing the
  main task, answer with a nod or a raised finger (hand gestures).
- **Private by design:** end-to-end encrypted; the relay is blind; your code and chats stay on your own computer.
- **Runs everywhere:** macOS, Linux and Windows (WSL2). One command to install.

RemoteCC is a small bridge that runs next to Claude Code on your Mac (or Linux / Windows-WSL2 machine) and a web app at
[remotecc.dev](https://remotecc.dev) that talks to it. Start, watch and answer Claude Code sessions from your phone,
your laptop or any other browser. Everything between your device and your computer is end-to-end encrypted; the relay in
the middle is blind.

<!-- hidden for now:
> **On iPhone?** Get the native app: [**AI Code Remote**](https://apps.apple.com/app/id6797019430) on the App Store.
> It pairs with the same bridge.
-->

## Quick start

1. On the computer that runs Claude Code, open a terminal and run:

   ```bash
   curl -fsSL https://remotecc.dev/install.sh | bash
   ```

2. Open **[remotecc.dev](https://remotecc.dev)** in a browser. On the same computer it pairs by itself; from another
   device use the menu bar icon → "Pair a phone or browser…" and paste the link (or scan the QR code with the iPhone app).
3. Pick a project, send a message. Claude Code runs on your computer; you see it live.

### Two ways to open the web app

| | Where | Good for |
|---|---|---|
| **Local** | `http://127.0.0.1:7791`, served by the bridge on your computer (`remotecc web`, or the menu bar → "Open the web app (local, this Mac)") | Using Claude Code on the same computer without depending on remotecc.dev. Same code as the site, taken from the signed release the bridge installed (`web-*` files), so it updates with the bridge and never loads the app from the internet |
| **Hosted** | [remotecc.dev](https://remotecc.dev) | Phones, tablets and other computers (browsers need HTTPS to reach your computer from another device) |

Both pair the same way and talk to the same bridge. Turn the local one off with `"local_web": 0` in the bridge config.

Windows: RemoteCC runs inside WSL2 — see [remotecc.dev/windows](https://remotecc.dev/windows).

## How it works

```
 browser / iPhone  <==  end-to-end encrypted  ==>  bridge  ->  claude (Claude Code CLI)
        |                                            |
        +----------->  relay.remotecc.dev  <---------+      (blind: forwards ciphertext, keeps no messages)
               (or direct over your LAN / Tailscale, still encrypted)
```

- The **bridge** (Python, `bridge/`) runs on your computer, owns the data (`~/.remotecc`) and launches `claude`.
- The **web app** (`web/`) is static files; it holds only a pairing key in your browser.
- The **relay** (`relay/`, a Cloudflare Worker + Durable Object) connects the two when they are not on the same network.
  It never has a key and stores no messages.

## Security model

- Pairing: X25519 key agreement; every frame is AES-256-GCM (HKDF-SHA256 derived keys); the pairing link expires in
  minutes and each pairing is confirmed with a 4-digit code on the computer.
- The relay only sees ciphertext sizes and timing. Push notifications carry fixed text and a random session id.
- Releases are signed. The bridge only installs updates signed with the RemoteCC release key
  `ClDHkat2E/DjMTt0HZuMFSdOItSIwnQA7WBf/ssB7YQ=` (Ed25519). Verify a download yourself with `./verify-release.sh`.
- Secrets you add are encrypted in the browser for your computer and kept in its keychain.
- Report vulnerabilities to **support@remotecc.dev**; see `SECURITY.md`.

## Repository layout

| Path | What |
|---|---|
| `bridge/` | The bridge, CLI (`remotecc`), menu bar app and installer pieces (Python) |
| `web/` | The web app (`web/public`), its Cloudflare Worker (`web/src`), `install.sh`, `deploy.sh`, tests |
| `relay/` | The blind relay (Cloudflare Worker + Durable Object) |
| `docs/` | `PROTOCOL.md` (wire format the iOS app relies on) |

## Self-hosting

Everything is plain Cloudflare Workers; no database.

- Web: `cd web && npx wrangler deploy` (worker `remotecc-web`, static assets from `web/public`). Change the route in
  `web/wrangler.toml` to your domain.
- Relay: `cd relay && npx wrangler deploy` (worker `remotecc-relay`, route `relay.remotecc.dev`). Push notifications need
  the wrangler secrets `APNS_KEY` and `APNS_KEY_ID` (and `APNS_TEAM` in `wrangler.toml`); skip them to run without push.
- The relay host is taken from the pairing data, so a bridge pointed at your own relay works with the hosted web app too.
- Signing: generate your own Ed25519 release key, publish its public key in the installer, and sign releases with `web/deploy.sh`.

## Tests

```bash
cd web && node --test test/*.test.mjs        # web crypto/format, plus interop with the Python bridge
# interop needs Python with `cryptography`:  PY=/path/to/python node --test test/*.test.mjs
node --check relay/src/relay.js
```

## Contributing

Issues and pull requests are welcome. Keep the wire protocol (`docs/PROTOCOL.md`) backward compatible: the shipped iPhone
app depends on it (`clo2://` links, `clo2-lan` key info, relay paths). Run the tests before sending a PR.

## Licence

Apache-2.0 © 2026 RemoteCC. Contact: support@remotecc.dev.

Not affiliated with Anthropic. Claude and Claude Code are trademarks of Anthropic.
