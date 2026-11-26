"""Files Claude sends into the chat: remotecc-send FILE → remotecc://media/<id>, fetched by the phone in chunks (op media).
~/.remotecc/venv/bin/python -I bridge/tests/media.py"""
import base64, os, pathlib, subprocess, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from harness import Bridge, check, done, HERE

b = Bridge(7796, "media")
a = b.pair("Media phone")
env = {**os.environ, "REMOTECC_DIR": str(b.tmp / "id"), "REMOTECC_STORE": str(b.tmp / "store.db")}
tool = lambda *args: subprocess.run([sys.executable, "-I", str(HERE / "remotecc_tools.py"), *args], env=env, capture_output=True, text=True)

clip = b.tmp / "clip.mp4"
body = os.urandom(2 * 1024 * 1024 + 12345)   # 3 chunks
clip.write_bytes(body)
r = tool("send", str(clip), "--title", "Video thử")
link = r.stdout.strip()
mid = link.rsplit("/", 1)[-1]
check("remotecc-send prints a remotecc://media link", r.returncode == 0 and link.startswith("remotecc://media/"), r.stderr)
got, off = b"", 0
while True:
    x = a.op("media", mid=mid, offset=off, length=1048576)
    if x.get("status") != 200:
        break
    part = base64.b64decode(x["body"]["data"])
    if not part:
        break
    got += part
    off += len(part)
    meta = x["body"]
    if off >= meta["size"]:
        break
check("phone downloads it in chunks, byte for byte", got == body, (len(got), len(body)))
check("meta: name, mime, size, title", meta["name"] == "clip.mp4" and meta["mime"] == "video/mp4" and meta["size"] == len(body) and meta["title"] == "Video thử")
check("chunk capped at 1 MB", len(base64.b64decode(a.op("media", mid=mid, offset=0, length=50_000_000)["body"]["data"])) == 1048576)
check("unknown / malformed id → 404", a.op("media", mid="../../etc/passwd")["status"] == 404 and a.op("media", mid="nope123456")["status"] == 404)
check("missing file → usage error", tool("send", str(b.tmp / "nope.png")).returncode != 0)
done()
