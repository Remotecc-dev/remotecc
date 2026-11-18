# Security

RemoteCC gives a browser control over Claude Code on your computer, so security is the core of the design.

## End-to-end encryption
- Pairing uses X25519 key agreement; every frame is encrypted with AES-256-GCM using keys derived with HKDF-SHA256.
- The relay sees only ciphertext sizes and timing. It holds no keys and stores no messages.
- Push notifications carry fixed text and a random session id — never your content.

## Pairing you control
- Pairing links expire within minutes; each new device is confirmed with a 4-digit code on your computer.
- You choose where devices may pair from (Tailscale, the same Wi-Fi, or anywhere) and can revoke any device.
- A browser can be locked with a PIN after idle time; its pairing key is then encrypted with that PIN.

## Signed releases
The bridge only installs updates signed with the RemoteCC release key (Ed25519):
`ClDHkat2E/DjMTt0HZuMFSdOItSIwnQA7WBf/ssB7YQ=`. Check a release yourself with `verify-release.sh` from the
[repository](https://github.com/Remotecc-dev/remotecc). The installer refuses files whose signature or hash doesn't match.

## Your data stays on your computer
Sessions, queued messages, artifacts and files live in `~/.remotecc`. Secrets you add are encrypted in the browser for
your computer and kept in its keychain. Conversation history belongs to Claude Code (`~/.claude`).

## What Claude may do
Choose **Standard** (Claude asks before risky actions) or **Full access** per computer with
`remotecc settings access standard|full` (or `remotecc settings` to pick it interactively).

## Reporting a vulnerability
Email **support@remotecc.dev**. See `SECURITY.md` in the repository. Privacy details: [privacy](/privacy).

---
RemoteCC · https://remotecc.dev/security · open source: https://github.com/Remotecc-dev/remotecc
