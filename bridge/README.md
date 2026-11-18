# RemoteCC bridge (this Mac ↔ the RemoteCC app / web)

Lets the RemoteCC iPhone app (iPhone) and https://remotecc.dev see and continue this Mac's Claude Code sessions. No cloud
account: everything is stored here (`~/.remotecc/store.db`); devices reach it end-to-end encrypted through the relay
(`relay.remotecc.dev`), or straight over the Wi-Fi when on the same network (app only).

- `remotecc_bridge.py` — session mirror, inbox (runs `claude -p --resume <id>`), queue, /btw, suggestions, push requests.
- `localstore.py` — SQLite with the Firestore REST shape · `tunnel.py` — pairing, E2E frames, relay + direct path.
- `pairpage.py` — http://127.0.0.1:7790 (pair by QR, approve with the 4-digit code, revoke, reset).
- `remotecc_tools.py` — `remotecc-artifact`, `remotecc-secret`.
- `updater.py` — signed auto-update for one-line installs (`web/deploy.sh` publishes + signs).

```bash
curl -fsSL https://remotecc.dev/install.sh | bash   # other Macs: ~/.remotecc/app, venv, LaunchAgents
./install.sh             # from a checkout: venv + LaunchAgent dev.remotecc.bridge
./restart.sh             # graceful restart (waits for running turns — never kickstart mid-turn)
./install.sh uninstall   # remove both agents (data in ~/.remotecc stays)
tail -f ~/Library/Logs/remotecc-bridge.log
```

Overrides in `bridge/config.json` (gitignored), e.g. `{"lan_port": 0}` (relay only), `{"label": "MacBook"}`.
Tests (throwaway bridges, own ports/identity; never touch the installed one): `tests/edge_cases.py --turn`,
`tests/turns.py`, `files.py`, `extras.py`, `lan.py`, `update.py`; Swift side `../tests/crypto_interop/run.sh`,
`../tests/lan_swift/run.sh`; web `cd ../web && node --test test/`.
