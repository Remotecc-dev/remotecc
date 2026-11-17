# Wire identifiers kept from CLO 2

RemoteCC was forked from CLO 2. The shipped iOS app ("RemoteCC", App Store id6797019430) speaks the CLO 2 wire
protocol, and the web client shares it. Renaming any identifier below would silently break pairing, decryption or
sync with already-installed apps, so they keep their original spelling. Everything else (names, paths, ports, labels,
env vars, commands, hosts) is RemoteCC. In code each one is marked `# wire id — the iOS app depends on it`.

| Identifier | Where | Why it is kept |
|---|---|---|
| `d` query item of the pairing link (QR now `https://remotecc.dev/?d=…`; `clo2://pair?d=…` still accepted) | `bridge/tunnel.py` (pairing link / QR) | registered by the iOS app; the Camera app opens it |
| `clo2://artifact/<id>` | `bridge/remotecc_tools.py`, `ARTIFACT_HINT` in `bridge/remotecc_bridge.py` | the app and web turn these links into live previews |
| `clo2.fetch(…)` | `ARTIFACT_HINT` | JavaScript API the app/web inject into artifact pages |
| `_clo2._tcp` (Bonjour) + TXT keys | `bridge/tunnel.py` | the app browses for this service type |
| HKDF salt `clo2-v1` (info = macPub ‖ devicePub) | `bridge/tunnel.py`, tests | relay/LAN session key; Swift and JS derive the same |
| HKDF info `clo2-lan` | `bridge/tunnel.py` | per-connection key of the direct Wi-Fi path |
| HKDF salt `clo2-push` | `bridge/tunnel.py` | key for sealed push-notification text, opened by the app's extension |
| `clo-secret v1` (box key hash), AAD `clo-secret\|<name>\|<machine>` | `bridge/remotecc_bridge.py` | secrets sealed by the app/web are opened by the Mac and vice versa |
| `clo-share\|<uid>\|<name>\|<device>\|…` | `bridge/remotecc_bridge.py` | signed payload of re-sealed secrets, verified by apps |
| Document paths `clo/{uid}/…`, `clo/local/…` (`terminalSessions`, `terminalInbox`, `terminalImages`, `devices`, `liveActivities`, `secrets`, `secretShares`, `vault/devices`, `skills`, `skillTombstones`, `saved`, `openLoops`, `bridge`, `artifacts`) | `bridge/remotecc_bridge.py`, `bridge/localstore.py`, `bridge/remotecc_tools.py`, tests | the app addresses the Mac's local store with Firestore-style paths over the tunnel |
| Op names, JSON field names, `source: "clo"` in process rows | everywhere | part of the request/response schema |
| Relay URL paths `/room/<id>?role=…` | `bridge/tunnel.py` | the relay and apps use the same routes |
| Secret-request link `clo2-secret://ask?name=…&label=…` (printed by `remotecc-secret ask`) | `bridge/remotecc_tools.py`, `bridge/remotecc_bridge.py` | The iOS app only turns `clo-secret://` / `clo2-secret://ask` into a secure input card |
| APNs topic `com.leo.pdfstudio` (relay allow-list); test topic `com.leo.clo2` | relay, `bridge/tests/push_sim.py` | Apple bundle id of the shipped app |
| Web `localStorage` keys `clo.*`, `clo2.*` | web client | internal, per origin |

Local-only names (Keychain service `remotecc-secrets`, vault file AAD `remotecc-vault`, `~/.remotecc*`) are not wire
and were renamed; a machine can run CLO 2 and RemoteCC side by side.
