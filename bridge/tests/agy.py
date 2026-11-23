"""agy (Google Antigravity CLI, Gemini) sessions from the app: new turn, resume, switching model mid-session, Standard
(commands refused), Full access, stop, and the session mirrored with agent "agy". Real agy turns (needs `agy` signed in).
  ~/.remotecc/venv/bin/python -I bridge/tests/agy.py"""
import pathlib, secrets, shutil, subprocess, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from harness import Bridge, check, done

PROJ = pathlib.Path(f"/tmp/remotecc-agy-{secrets.token_hex(3)}").resolve(); PROJ.mkdir()
OUT = pathlib.Path.home() / f"remotecc-agy-std-{secrets.token_hex(3)}.txt"
YOLO = pathlib.Path.home() / f"remotecc-agy-yolo-{secrets.token_hex(3)}.txt"
AGY_DIR = pathlib.Path.home() / ".remotecc/agy"
made = []
import atexit
atexit.register(lambda: [shutil.rmtree(PROJ, ignore_errors=True), OUT.unlink(missing_ok=True), YOLO.unlink(missing_ok=True)]
                + [(AGY_DIR / f"{s}.json").unlink(missing_ok=True) for s in made])

# model picking (no agy run): family + effort → id, clamped to what agy offers
import importlib.util, os
os.environ.setdefault("REMOTECC_CONFIG", "{}")
src = (pathlib.Path(__file__).resolve().parent.parent / "remotecc_bridge.py").read_text()
start, end = src.index("AGY_FAMILIES = "), src.index("def agy_args(")
ns = {"re": __import__("re"), "CONFIG": {"agy_model": "gemini-4-neon-medium"}}
exec(src[start:end], ns)
m = ns["agy_model"]
check("model: family + effort", m({"model": "carbon", "effort": "high"}) == "gemini-4-carbon-high", m({"model": "carbon", "effort": "high"}))
check("model: max → the family's top level", m({"model": "neon", "effort": "max"}) == "gemini-4-neon-xhigh" and
      m({"model": "flash", "effort": "max"}) == "gemini-3.8-flash-high")
check("model: no effort → medium; nothing picked → the Mac's default", m({"model": "flash"}) == "gemini-3.8-flash-medium"
      and m({}) == "gemini-4-neon-medium" and m({"model": "claude-opus-5-5"}) == "gemini-4-neon-medium")

# agy usage + quota (no agy run): tokens per day, Google's "quota reached … Resets in" → a clear limit until the reset
import datetime as _dt, tempfile, threading
start, end = src.index("AGY_USAGE = "), src.index("def run_agy(")
tmpdir = pathlib.Path(tempfile.mkdtemp())
uns = {"re": __import__("re"), "json": __import__("json"), "os": os, "dt": _dt, "threading": threading, "STATE": tmpdir,
       "now": lambda: _dt.datetime.now(_dt.timezone.utc)}
exec(src[start:end], uns)
uns["agy_count"](1200); uns["agy_count"](800)
u = uns["agy_usage"]()
check("usage: today's tokens and turns add up", u["today"] == 2000 and u["turnsToday"] == 2 and u["week"] == 2000, u)
raw = "agent executor error: model unreachable: RESOURCE_EXHAUSTED (code 429): Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 15h45m40s.: RESOURCE_EXHAUSTED"
msg, until = uns["agy_quota"](raw, "gemini-4-neon-medium")
left = (until - _dt.datetime.now(_dt.timezone.utc)).total_seconds()
check("quota: clear message with the reset time", "Gemini limit reached for gemini-4-neon-medium" in msg and "resets in 15h45m" in msg
      and 15 * 3600 + 44 * 60 < left <= 15 * 3600 + 46 * 60, (msg, left))
check("…listed as a limit in force", [l["model"] for l in uns["agy_usage"]()["limits"]] == ["gemini-4-neon-medium"])
check("…an ordinary error isn't a quota", uns["agy_quota"]("agy exit 1: no such file", "x") is None)
uns["agy_quota_clear"]("gemini-4-neon-medium")
check("…cleared once that model answers again", uns["agy_usage"]()["limits"] == [])
shutil.rmtree(tmpdir, ignore_errors=True)

b = Bridge(7803, "agy")
a = b.pair("agy phone")


def turn(text, sid="", profile="agy", model="flash", effort="low", t=300):
    rid = secrets.token_hex(8)
    a.queue(rid, text, sid=sid, cwd=str(PROJ), profile=profile, model=model, effort=effort)
    st, f = a.wait(rid, t=t)
    g = lambda k: f.get(k, {}).get("stringValue", "")
    if g("resultSessionId"):
        made.append(g("resultSessionId"))
    return st, g("reply"), g("resultSessionId"), g("error"), rid


st, reply, sid, err, _ = turn("Create a file hello.txt in the current folder containing the word hi, then reply with exactly: done")
print("   reply:", reply[-300:])
check("new agy session: turn done, file made in the project", st == "done" and sid and (PROJ / "hello.txt").exists(), (st, err))
check("…its tools show as 🔧 lines, the answer after them", "🔧" in reply and reply.index("🔧") < reply.index("done"), reply)


def session_doc():
    for _ in range(20):
        d = a.doc(f"clo/local/terminalSessions/{sid}")
        if d: return d
        time.sleep(1)
    return {}


doc = session_doc()
g = lambda k: (doc.get(k) or {}).get("stringValue", "")
check("session listed in the app as an agy session (title, folder, model)", g("agent") == "agy" and "hello.txt" in g("title")
      and g("cwd").endswith(PROJ.name) and g("model") == "gemini-3.8-flash-low", {k: g(k) for k in ("agent", "title", "cwd", "model")})
tr = [(x["mapValue"]["fields"]["role"]["stringValue"]) for x in (doc.get("transcript") or {}).get("arrayValue", {}).get("values", [])]
check("…its transcript: your message, then agy", tr[:2] == ["user", "assistant"], tr)
check("…the RemoteCC hints aren't shown in your message", "[RemoteCC]" not in str(doc.get("transcript")))

st, reply, sid2, err, _ = turn("What is the name of the file you created? Reply with just the file name.", sid=sid,
                               profile="claude-yolo", model="carbon")
check("resume with another model: same session, remembers it (even with Claude picked)", st == "done" and sid2 == sid
      and "hello.txt" in reply, (st, reply[-200:], err))
time.sleep(3)
doc = session_doc()
check("…the session now shows the new model", (doc.get("model") or {}).get("stringValue") == "gemini-4-carbon-low", doc.get("model"))

rid = secrets.token_hex(8)
a.queue(rid, "/btw what time is it?", sid=sid, cwd=str(PROJ), profile="agy", fork=True)
st, f = a.wait(rid, t=60)
check("btw on an agy session: refused with a clear message (no 2nd turn on the conversation)",
      st == "error" and "agy" in f.get("error", {}).get("stringValue", ""), (st, f.get("error")))

import base64
px = base64.b64encode(bytes.fromhex("ffd8ffe000104a46494600010100000100010000ffd9")).decode()   # a tiny JPEG
rid = secrets.token_hex(8)
a.queue(rid, "Reply with exactly: seen", sid=sid, cwd=str(PROJ), profile="agy", model="flash", effort="low", images=[px])
st, f = a.wait(rid, t=300)
time.sleep(3)
users = [x["mapValue"]["fields"]["text"]["stringValue"] for x in (session_doc().get("transcript") or {}).get("arrayValue", {}).get("values", [])
         if x["mapValue"]["fields"]["role"]["stringValue"] == "user"]
check("a photo shows as a photo in your message, not the bridge's header + Mac path",
      st == "done" and users and "Reply with exactly: seen" in users[-1] and "remotecc-uploads" not in users[-1] and "đính kèm" not in users[-1],
      (st, users[-1:] if users else None))

st, reply, _, err, _ = turn(f"Run this shell command: echo x > {OUT} ; then reply ok (or say you weren't allowed).")
check("Standard: commands that need permission are refused", not OUT.exists(), (st, reply[-300:]))

st, reply, _, err, _ = turn(f"Run this shell command: echo x > {YOLO} ; then reply ok.", profile="agy-yolo")
print("   full access:", st, err[:200])
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import tunnel as _t
if _t.setting("access") == "full":
    check("Full access (allowed on this Mac): it can", st == "done" and YOLO.exists(), (st, reply[-300:], err))
else:
    check("Full access asked but this Mac caps it at Standard: still refused", not YOLO.exists(), (st, reply[-300:]))

rid = secrets.token_hex(8)
a.queue(rid, "Run the shell command `sleep 120`, then reply ok.", cwd=str(PROJ), profile="agy-yolo", model="flash", effort="low")
for _ in range(90):
    if "agy session" in b.log() and a.doc(f"clo/local/terminalInbox/{rid}").get("status", {}).get("stringValue") == "running": break
    time.sleep(1)
time.sleep(8)
a.call("PATCH", f"clo/local/terminalInbox/{rid}?updateMask.fieldPaths=status", {"fields": {"status": {"stringValue": "cancel"}}})
st, f = a.wait(rid, t=60)
if f.get("resultSessionId", {}).get("stringValue"):
    made.append(f["resultSessionId"]["stringValue"])
check("stop works", st == "cancelled", st)
machine = subprocess.run(["hostname", "-s"], capture_output=True, text=True).stdout.strip()
feats = str((a.doc(f"clo/local/bridge/{machine}") or {}).get("features", ""))
check("the bridge lists agy and per-message models in its features", "'agy'" in feats and "'models'" in feats, feats[:400])
au = (((a.doc(f"clo/local/bridge/{machine}") or {}).get("agyUsage") or {}).get("mapValue") or {}).get("fields") or {}
check("…and agy's usage today (tokens counted from these turns)", int((au.get("today") or {}).get("integerValue") or 0) > 0, au)
done()
