"""The iOS app upgraded through the bridge: `app.config` (appconfig.json) and `bundle.get` (a web screen + the release's
MANIFEST.json/.sig so the app can check it). The bridge runs from a copy of bridge/ turned into a release signed with a
throwaway key, as an installed Mac would have it; a git checkout (no signature) must refuse to hand out screens."""
import base64, hashlib, json, pathlib, shutil, sys
import harness
from harness import Bridge, check, done
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

SRC = harness.HERE
REL = pathlib.Path("/tmp/remotecc-appconfig-release")
shutil.rmtree(REL, ignore_errors=True)
shutil.copytree(SRC, REL, ignore=shutil.ignore_patterns("tests", "__pycache__", "config.json"))
names = ["remotecc_bridge.py", "tunnel.py", "appconfig.json", "webapp-theme-studio.html"]
m = json.dumps({"version": "test", "seq": 1, "files": {n: hashlib.sha256((REL / n).read_bytes()).hexdigest() for n in names}}).encode()
key = Ed25519PrivateKey.generate()
(REL / "MANIFEST.json").write_bytes(m)
(REL / "MANIFEST.sig").write_text(base64.b64encode(key.sign(m)).decode())

# 1. a git checkout: config yes, web screens no
harness.HERE = SRC
b = Bridge(7461, "appcfg-dev")
d = b.pair("App test")
r = d.op("app.config", build=67, proto=1, caps=["webpanel"])
cfg = r.get("body") or {}
check("app.config answers with the features", r.get("status") == 200 and "themeWeb" in (cfg.get("features") or {}), r)
check("app.config says which bridge", cfg.get("bridge"), cfg)
r = d.op("bundle.get", name="theme-studio")
check("checkout bridge (no signature) → no web screen", r.get("status") == 404, r)
r = d.op("bundle.get", name="../tunnel")
check("bad screen name refused", r.get("status") == 400, r)
b.stop()

# 2. an installed (signed) release
harness.HERE = REL
b = Bridge(7462, "appcfg-rel")
d = b.pair("App test 2")
r = d.op("bundle.get", name="theme-studio")
body = r.get("body") or {}
ok = r.get("status") == 200
if ok:
    man, html = base64.b64decode(body["manifest"]), base64.b64decode(body["html"])
    try:
        key.public_key().verify(base64.b64decode(body["sig"]), man); sig_ok = True
    except Exception:
        sig_ok = False
    files = json.loads(man)["files"]
    check("signed release → screen + manifest + signature", sig_ok and body.get("file") == "webapp-theme-studio.html")
    check("screen matches its hash in the signed manifest", hashlib.sha256(html).hexdigest() == files.get(body["file"]))
    tampered = html.replace(b"Themes", b"Th3mes")
    check("a changed screen doesn't match", hashlib.sha256(tampered).hexdigest() != files.get(body["file"]))
else:
    check("signed release → screen", False, r)
r = d.op("bundle.get", name="nope")
check("unknown screen → 404", r.get("status") == 404, r)
b.stop()
shutil.rmtree(REL, ignore_errors=True)
done()
