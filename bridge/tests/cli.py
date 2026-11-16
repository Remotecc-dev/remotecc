"""`remotecc` command against a throwaway bridge: pair prints a QR and notices the new device, status / devices / revoke,
settings (non-interactive) reach the bridge and gate yolo, skill install/remove only touches RemoteCC's own file."""
import os, pathlib, subprocess, sys, tempfile, threading, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import Bridge, Device, check, done, HERE

sys.path.insert(0, str(HERE))
b = Bridge(7795, "cli")
home = pathlib.Path(tempfile.mkdtemp())


def remotecc(*args, t=60):
    env = {**os.environ, "REMOTECC_PAGE": b.page, "HOME": str(home)}
    return subprocess.run([sys.executable, "-I", str(HERE / "remotecc_cli.py"), *args], env=env, capture_output=True,
                          text=True, timeout=t, stdin=subprocess.DEVNULL)


out = remotecc("status").stdout
check("status: online, defaults Tailscale-or-Wi-Fi + Full access", "online" in out and "Tailscale or same Wi-Fi" in out
      and "Access: Full access" in out, out)

# pair: QR in the terminal, then it notices the device that pairs with that code (scan → `a` → approved at once)
res = {}
th = threading.Thread(target=lambda: res.update(r=remotecc("pair", t=90)))
th.start()
for _ in range(40):
    if b.state().get("pairing"):
        break
    time.sleep(0.5)
time.sleep(1)
d = Device(b, "CLI phone")   # asks with the sent link → waits for approval (the QR's `a` would pair at once)
out2 = remotecc("devices").stdout
check("devices: nothing paired before approval", "CLI phone" not in out2, out2)
d.approve()
th.join(90)
out = res["r"].stdout
check("pair: prints a QR block", "█" in out or "▀" in out or "▄" in out, out[:300])
check("…and 'Only pair devices you own'", "Only pair devices you own" in out)
check("pair noticed the new device", "Paired: CLI phone" in out, out[-300:])
check("devices lists it", "CLI phone" in remotecc("devices").stdout)
out = remotecc("revoke", "CLI phone").stdout
check("revoke by name", "Revoked CLI phone" in out and not b.state()["devices"], out)

# settings, non-interactive
out = remotecc("settings", "pair-via", "tailnet").stdout
check("settings pair-via tailnet", b.state()["pairVia"] == "tailnet", out)
remotecc("settings", "access", "standard")
check("settings access standard", b.state()["access"] == "standard")
r = remotecc("settings", "access", "full")
check("access full without a terminal and without --yes → refused", r.returncode != 0 and b.state()["access"] == "standard", r.stderr)
out = remotecc("settings", "access", "full", "--yes").stdout
check("settings access full --yes", b.state()["access"] == "full", out)
remotecc("settings", "access", "standard")
check("bridge heartbeat field follows", b.state()["access"] == "standard")
check("bad value refused", remotecc("settings", "access", "root").returncode != 0)
check("bad value via API refused", b.post("/api/settings", {"key": "access", "value": "root"}) == 400)

# skill: install, leave someone else's file alone, remove
out = remotecc("skill", "install").stdout
sk = home / ".claude/skills/remotecc/SKILL.md"
check("skill installed", sk.exists() and "name: remotecc" in sk.read_text(), out)
remotecc("skill", "remove")
check("skill removed", not sk.exists())
sk.parent.mkdir(parents=True, exist_ok=True)
sk.write_text("my own skill")
remotecc("skill", "install")
check("someone else's skill file left alone", sk.read_text() == "my own skill")
remotecc("skill", "remove")
check("…and not removed", sk.exists())

b.stop()
out = remotecc("status")
check("bridge down → clear message", out.returncode != 0 and "isn't running" in out.stderr, out.stderr)
done()
