#!/bin/bash
# Publish remotecc.dev : the web app + the bridge files the installer downloads (copied fresh from ../bridge),
# plus bridge/MANIFEST.json (version, seq, sha256 per file) signed with the release key (vault: REMOTECC_RELEASE_KEY) —
# installed bridges take an update only when that signature checks (bridge/updater.py).
# The key is on the MacBook and wrangler is logged in on the mini: sign here, rsync public/ to the mini, deploy there.
set -euo pipefail
cd "$(dirname "$0")"
FILES="trial.py remotecc_bridge.py localstore.py tunnel.py pairpage.py themes.py remotecc_tools.py remotecc_cli.py updater.py remotecc-resume install.sh restart.sh appconfig.json webapp-theme-studio.html"
if [[ -n "$(git -C .. status --porcelain -- bridge)" && -z "${REMOTECC_DEPLOY_DIRTY:-}" ]]; then
  echo "bridge/ has uncommitted changes — commit first (installed Macs update to what's published)"; exit 1
fi
# A release that can't even start can't roll itself back (bridge/trial.py runs inside it): refuse to sign one.
for f in $FILES; do
  case "$f" in
    *.py|remotecc-resume) "${REMOTECC_PY:-$HOME/.remotecc/venv/bin/python}" -m py_compile "../bridge/$f" || { echo "$f doesn't compile — not released"; exit 1; } ;;
    *.sh) bash -n "../bridge/$f" || { echo "$f has a shell syntax error — not released"; exit 1; } ;;
    *.json) "${REMOTECC_PY:-$HOME/.remotecc/venv/bin/python}" -c "import json,sys; json.load(open(sys.argv[1]))" "../bridge/$f" || { echo "$f isn't valid JSON — not released"; exit 1; } ;;
  esac
done
python3 pages/build.py   # content pages, sitemap.xml, llms.txt from web/pages/*.md
rm -rf public/bridge && mkdir -p public/bridge
for f in $FILES; do cp "../bridge/$f" public/bridge/; done
# The web app also ships inside the signed release as web-<name>: the bridge serves it on http://127.0.0.1:7791
# (the local option to remotecc.dev). A web-only change makes a new release that bridges take without a restart.
WEBFILES="index.html app.js beacon.js styles.css fs.js i18n.js theme.js tunnel.js vibe.js vibe-core.js vibe-guide.html logo.svg icon.png apple-touch-icon.png"
for f in $WEBFILES; do cp "public/$f" "public/bridge/web-$f"; FILES="$FILES web-$f"; done
git -C .. log -1 --format="%h %cs" > public/bridge/VERSION
PY="${REMOTECC_PY:-$HOME/.remotecc/venv/bin/python}"
SEQ="$(git -C .. rev-list --count HEAD)" VERSION="$(cat public/bridge/VERSION)" FILES="$FILES" \
  clo-secret run REMOTECC_RELEASE_KEY -- "$PY" -I - <<'PY'
import base64, hashlib, json, os, pathlib
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
d = pathlib.Path("public/bridge")
files = {f: hashlib.sha256((d / f).read_bytes()).hexdigest() for f in os.environ["FILES"].split()}
m = json.dumps({"version": os.environ["VERSION"], "seq": int(os.environ["SEQ"]), "files": files,
                # "rumps" stays bare: updaters before 2026-11-06 skip it on Linux only when it's exactly "rumps" (a
                # versioned rumps made every Linux bridge fail pip and stay on its old release). macOS installs pin it.
                "pip": ["cryptography>=42,<51", "websockets>=13,<18", "rumps", "segno>=1.6,<2"]}, indent=1).encode()
# Every updater ever shipped must be able to take this release (or Macs/Linux boxes stay on their old one forever):
# updaters before 2026-11-06 accept only [A-Za-z0-9_.-[]<>=,] specs and skip rumps on Linux only when it's exactly "rumps".
import re as _re
for _p in json.loads(m)["pip"]:
    assert _re.fullmatch(r"[A-Za-z0-9_.\-\[\]<>=,]{1,60}", _p), f"pip spec old updaters drop: {_p}"
    assert not _p.startswith("rumps") or _p == "rumps", "rumps must stay bare (old Linux updaters)"
# Same bridge files + pip as the live release → keep that release (same MANIFEST/sig/VERSION, same seq): a web-only
# deploy must not make every installed Mac (customers too) update and restart its bridge for nothing.
# REMOTECC_FORCE_RELEASE=1 signs a new one anyway; if the live manifest can't be read, a new one is signed (safe default).
if not os.environ.get("REMOTECC_FORCE_RELEASE"):
    import urllib.request
    base = os.environ.get("REMOTECC_BASE") or "https://remotecc.dev"
    try:
        get = lambda n: urllib.request.urlopen(urllib.request.Request(f"{base}/bridge/{n}?nocache={os.getpid()}",
            headers={"User-Agent": "remotecc-deploy"}), timeout=15).read()   # Cloudflare 403s urllib's default agent
        live_raw, live_sig = get("MANIFEST.json"), get("MANIFEST.sig")
        live, new = json.loads(live_raw), json.loads(m)
        if live.get("files") == new["files"] and live.get("pip") == new["pip"] and isinstance(live.get("seq"), int):
            (d / "MANIFEST.json").write_bytes(live_raw)
            (d / "MANIFEST.sig").write_bytes(live_sig)
            (d / "VERSION").write_text(str(live.get("version") or "") + "\n")
            print("bridge unchanged — keeping release", live.get("version"), "seq", live["seq"], "(installed Macs won't update)")
            raise SystemExit(0)
    except SystemExit:
        raise
    except Exception as e:
        print("couldn't read the live release (", e, ") — signing a new one")
# seq only ever goes up: installed bridges skip anything <= what they run. The commit count can't be trusted for that
# (the public repo's history was restarted on 2026-11-16), so a new release is always above the live one.
try:
    import urllib.request
    _base = os.environ.get("REMOTECC_BASE") or "https://remotecc.dev"
    _live = json.loads(urllib.request.urlopen(urllib.request.Request(f"{_base}/bridge/MANIFEST.json?seq={os.getpid()}",
        headers={"User-Agent": "remotecc-deploy"}), timeout=15).read())
    _floor = int(_live.get("seq") or 0) + 1
except Exception as e:
    raise SystemExit(f"couldn't read the live release seq ({e}) — not signing (a lower seq would never install)")
_m = json.loads(m)
if _m["seq"] < _floor:
    _m["seq"] = _floor
    m = json.dumps(_m, indent=1).encode()
key = Ed25519PrivateKey.from_private_bytes(base64.b64decode(os.environ["REMOTECC_RELEASE_KEY"]))
(d / "MANIFEST.json").write_bytes(m)
(d / "MANIFEST.sig").write_text(base64.b64encode(key.sign(m)).decode())
print("signed release", os.environ["VERSION"], "seq", json.loads(m)["seq"])
PY
cp install.sh public/install.sh
# wrangler's own login expires: then deploy with the Cloudflare token from the vault (by name, never printed)
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]] && ! npx -y wrangler@4 whoami 2>/dev/null | grep -q "You are logged in"; then
  CLOUDFLARE_API_TOKEN="$(clo-secret get CLOUDFLARE_SUPER_TOKEN)"; export CLOUDFLARE_API_TOKEN
fi
npx -y wrangler@4 deploy
# IndexNow (Bing, Yandex, Seznam…; Bing feeds ChatGPT search): tell them the pages may have changed. Key file: public/b5efd5a0a4748a57a5940fe5bd2c4b80.txt
python3 - <<'PY' || true
import json, re, urllib.request
urls = re.findall(r"<loc>([^<]+)</loc>", open("public/sitemap.xml").read())
body = json.dumps({"host": "remotecc.dev", "key": "b5efd5a0a4748a57a5940fe5bd2c4b80", "keyLocation": "https://remotecc.dev/b5efd5a0a4748a57a5940fe5bd2c4b80.txt", "urlList": urls}).encode()
r = urllib.request.urlopen(urllib.request.Request("https://api.indexnow.org/indexnow", data=body,
    headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": "remotecc-deploy"}), timeout=20)
print("IndexNow:", r.status, len(urls), "urls")
PY

