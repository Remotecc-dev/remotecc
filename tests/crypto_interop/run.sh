#!/bin/zsh
# RemoteCC: Swift (CryptoKit) ↔ Python (cryptography) wire-format interop. Run on a Mac: tests/crypto_interop/run.sh
set -e
cd "$(dirname "$0")/../.."
swiftc -O -o /tmp/remotecc-crypto SuIn/Services/TunnelCrypto.swift tests/crypto_interop/main.swift 2>&1 | grep -v warning || true
"${PY:-$HOME/.remotecc/venv/bin/python}" -I - <<'PY'
import json, subprocess, sys
sys.path.insert(0, "bridge")
import tunnel as T
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives import serialization
k = X25519PrivateKey.generate()
ident = {"priv": T.b64u(k.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())),
         "pub": T.b64u(k.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw))}
sw = lambda *a: json.loads(subprocess.run(["/tmp/remotecc-crypto", *a], capture_output=True, text=True, check=True).stdout)
ok = True
def check(name, cond):
    global ok; ok &= bool(cond); print(("PASS " if cond else "FAIL ") + name)
s = sw("seal", ident["pub"], "Xin chào Mac — tiếng Việt có dấu ✓")
key = T.session_key(ident, s["devPub"])
check("python opens swift frame", T.open_frame(key, s["frame"]) == {"text": "Xin chào Mac — tiếng Việt có dấu ✓"})
check("check code matches", T.check_code(ident["pub"], s["devPub"]) == s["check"])
big = {"id": "1", "status": 200, "body": {"x": "a" * 3_000_000}}
frame = T.seal(key, big)
open("/tmp/remotecc-frame", "w").write(frame)
check("swift opens python frame (3 MB)", sw("open", s["devPriv"], ident["pub"], "@/tmp/remotecc-frame") == big)
check("swift rejects tampered frame", sw("tamper", s["devPriv"], ident["pub"], "@/tmp/remotecc-frame")["ok"] is False)
other = X25519PrivateKey.generate()
wrong = {"priv": T.b64u(other.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())), "pub": ident["pub"]}
try:
    T.open_frame(T.session_key(wrong, s["devPub"]), s["frame"]); check("wrong Mac key can't open", False)
except Exception:
    check("wrong Mac key can't open", True)
qr = "remotecc://pair?d=" + T.b64u(json.dumps({"v": 1, "r": "relay.remotecc.dev", "room": "abc_-123", "k": ident["pub"], "c": "code-_x", "n": "Mac của Leo"}).encode())
p = sw("parse", qr)
check("swift parses QR", p["ok"] and p["k"] == ident["pub"] and p["n"] == "Mac của Leo" and p["c"] == "code-_x")
check("swift rejects junk QR", sw("parse", "https://example.com/?d=zzz")["ok"] is False)
sys.exit(0 if ok else 1)
PY
