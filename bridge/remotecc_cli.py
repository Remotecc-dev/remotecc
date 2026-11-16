"""`remotecc` — RemoteCC on this Mac, from Terminal (talks to the running bridge on 127.0.0.1 only).

  remotecc pair                 show a QR code here; scan it with the AI Code Remote app (or pair over Wi-Fi / Tailscale)
  remotecc status               connection, settings, paired devices
  remotecc web [--online]       open the web app: served by this computer (http://127.0.0.1:7791), or remotecc.dev
  remotecc devices              paired devices · remotecc revoke NAME|ID  removes one
  remotecc settings             choose where devices may pair from and what Claude may do (interactive)
  remotecc settings pair-via tailnet|wifi|both|any · remotecc settings access standard|full [--yes]
  remotecc settings auto-update on|off   install signed updates automatically (on by default)
  remotecc tailscale            let the web app on your other computers reach this Mac over Tailscale (sets up
                            `tailscale serve` on :8444 once; run it here in Terminal)
  remotecc skill install|remove teach Claude Code about RemoteCC (~/.claude/skills/remotecc)
  remotecc uninstall            stop RemoteCC and remove its agents, commands and skill (data in ~/.remotecc stays)
"""
import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.request

PAGE = os.environ.get("REMOTECC_PAGE", "http://127.0.0.1:7790")
HOME = pathlib.Path.home()
HERE = pathlib.Path(__file__).resolve().parent
SKILL = HOME / ".claude/skills/remotecc/SKILL.md"
MARK = "<!-- written by RemoteCC (remotecc skill remove deletes it) -->"

PAIR_VIA = [("tailnet", "Tailscale only — devices on your tailnet"), ("wifi", "Same Wi-Fi only"),
            ("both", "Tailscale or same Wi-Fi (recommended)"), ("any", "Anywhere — also pairing links sent over the internet")]
ACCESS = [("full", "Full access (default) — claude --dangerously-skip-permissions: Claude runs ANY command without "
                   "asking"),
          ("standard", "Standard — claude --permission-mode acceptEdits: edits files in the project; scripts, installs "
                       "and network commands are refused")]

WARN_ACCESS = """
  ⚠️  Full access ("yolo") means Claude Code runs every command without asking: it can delete files, install
     software, read anything your user can read, and push code. A paired phone or browser can start such a turn.
     Use it only on a Mac you own, in projects under git with backups, and revoke lost devices at once
     (remotecc devices / the RemoteCC menu bar icon).
"""

SKILL_TEXT = f"""---
name: remotecc
description: RemoteCC (formerly RemoteCC) — the user drives Claude Code on this Mac from their phone/browser. Use when the user mentions RemoteCC or RemoteCC,
  pairing a phone, artifacts (clo2://artifact links), the secrets vault (remotecc-secret), or who/what can access this Mac.
---
{MARK}
# RemoteCC on this Mac

The user may be reading this session in the AI Code Remote app (phone) or web app. Turns started from there run as
`claude -p` through the RemoteCC bridge (LaunchAgent `dev.remotecc.bridge`, data in `~/.remotecc`).

## Commands (Terminal)
- `remotecc pair` — QR code to pair a phone/browser · `remotecc status` · `remotecc devices` · `remotecc revoke NAME`
- `remotecc settings` — where devices may pair from (Tailscale / Wi-Fi / both / anywhere) and access level
  (Standard, or Full access = yolo). Never switch to Full access without the user explicitly asking.
- `remotecc uninstall`

## Showing results on the phone
- `remotecc-artifact FILE.html --title "…"` publishes a self-contained HTML page; put the printed `clo2://artifact/…` link on
  its own line in the reply — the app shows a live preview. Rerun with `--id <id>` to update.

## Secrets
- `remotecc-secret list` shows names only. Use a value without printing it: `X=$(remotecc-secret get NAME) cmd`,
  `eval "$(remotecc-secret env NAME)"`, `remotecc-secret run NAME -- cmd`. Never echo, log, commit or write a value.
- Missing secret: put the line printed by `remotecc-secret ask NAME --label "…"` in the reply (the app shows a secure input).
"""


def api(path, body=None, timeout=5):
    req = urllib.request.Request(PAGE + path, data=None if body is None else json.dumps(body).encode(),
                                 headers={"X-RemoteCC": "1", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read() or b"{}")


def state():
    try:
        return api("/api/state")
    except Exception:
        start = ("systemctl --user restart remotecc-bridge" if sys.platform.startswith("linux")
                 else "launchctl kickstart gui/%d/dev.remotecc.bridge" % os.getuid())
        sys.exit(f"RemoteCC isn't running on this Mac. Start it: {start} "
                 "(or reinstall: curl -fsSL https://remotecc.dev/install.sh | bash)")


def tty_input(prompt):
    """Prompts work under `curl … | bash` too (stdin is the script there): read the terminal itself."""
    try:
        with open("/dev/tty") as t:
            sys.stdout.write(prompt)
            sys.stdout.flush()
            return t.readline().strip()
    except OSError:
        return ""


def choose(title, options, current):
    print(f"\n{title}")
    for i, (k, label) in enumerate(options, 1):
        print(f"  {i}. {label}" + ("   ← current" if k == current else ""))
    while True:
        a = tty_input(f"Choose 1–{len(options)} [Enter = keep]: ")
        if not a:
            return current
        if a.isdigit() and 1 <= int(a) <= len(options):
            return options[int(a) - 1][0]


def set_access(value, ask=True):
    if value == "full" and ask:
        print(WARN_ACCESS)
        if tty_input('  Type "yes" to allow Full access: ').lower() != "yes":
            print("  Kept Standard.")
            return
    api("/api/settings", {"key": "access", "value": value})
    print(f"Access: {dict(ACCESS)[value].split(' — ')[0]}")


def qr_text(link):
    try:
        import segno
    except ImportError:
        return None
    import io
    out = io.StringIO()
    segno.make(link, error="m").terminal(out=out, compact=True, border=2)
    return out.getvalue()


def cmd_pair():
    s = state()
    before = {d["id"] for d in s["devices"]}
    api("/api/pair/start", {})
    time.sleep(0.5)
    s = state()
    link = s.get("pairing")
    if not link:
        sys.exit("Couldn't start pairing — is RemoteCC online on this computer? (remotecc status)")
    print(f"\nPair a phone or browser with {s.get('label') or 'this computer'}\n")
    q = qr_text(link)
    print(q if q else "(QR needs the segno package — use the link below instead)")
    print(f"  Pairing link (paste it on https://remotecc.dev → “With a pairing link”):\n  {link}\n")
    print("  iPhone: open AI Code Remote → Scan QR code (or the Camera app). Scanning this code pairs at once.")
    print("  Same Wi-Fi / Tailscale: pick this computer in the app or on remotecc.dev, then type the 4-digit code in the dialog here.")
    print("  ⚠️  A paired device can run Claude Code on this computer as you. Only pair devices you own.\n")
    print("Waiting… (Ctrl-C to stop; the code expires in 5 minutes)")
    try:
        while True:
            time.sleep(1.5)
            s = state()
            new = [d for d in s["devices"] if d["id"] not in before]
            if new:
                print(f"\n✓ Paired: {', '.join(d['name'] for d in new)}. Manage devices: remotecc devices")
                return
            if not s.get("pairing"):
                print("\nPairing ended (expired or cancelled). Run remotecc pair again.")
                return
    except KeyboardInterrupt:
        api("/api/pair/stop", {})
        print("\nStopped.")


def cmd_status():
    s = state()
    print(f"{s.get('label') or 'This Mac'} · {'online' if s.get('online') else 'offline (relay not reachable)'}")
    print(f"Pairing from: {dict(PAIR_VIA).get(s.get('pairVia'), s.get('pairVia'))}")
    print(f"Access: {dict(ACCESS).get(s.get('access'), s.get('access')).split(' — ')[0]}")
    print(f"Automatic updates: {s.get('autoUpdate') or 'on'}")
    print(f"Paired devices: {len(s['devices'])}" + (f" · waiting: {len(s['pending'])}" if s.get("pending") else ""))
    print(f"Claude Code skill: {'installed' if SKILL.exists() else 'not installed (remotecc skill install)'}")


def cmd_devices():
    devs = state()["devices"]
    if not devs:
        return print("No paired devices. Pair one: remotecc pair")
    for d in devs:
        seen = time.strftime("%Y-%m-%d %H:%M", time.localtime(d["lastSeen"])) if d.get("lastSeen") else "never"
        print(f"  {d['name']:<28} added {time.strftime('%Y-%m-%d', time.localtime(d['addedAt']))} · last used {seen} · id {d['id'][:10]}")
    print("Remove one: remotecc revoke NAME")


def cmd_revoke(who):
    devs = state()["devices"]
    hit = [d for d in devs if d["name"] == who or d["id"].startswith(who)]
    if len(hit) != 1:
        sys.exit(f"{'No device' if not hit else 'Several devices'} match “{who}” — see remotecc devices")
    api("/api/revoke", {"id": hit[0]["id"]})
    print(f"Revoked {hit[0]['name']}.")


def cmd_settings(args):
    yes = "--yes" in args
    args = [a for a in args if a != "--yes"]
    if len(args) == 2:
        key, value = {"pair-via": "pairVia", "access": "access"}.get(args[0], ""), args[1]
        if key == "access" and value in dict(ACCESS):
            if value == "full" and not yes and not sys.stdin.isatty():
                sys.exit("Full access needs a person at the terminal (or --yes): remotecc settings access full")
            return set_access(value, ask=not yes)
        if args[0] == "auto-update" and value in ("on", "off"):
            api("/api/settings", {"key": "autoUpdate", "value": value})
            return print("Automatic updates: " + value + ("" if value == "on" else
                         " — you won't get fixes (including security fixes) until you choose 'Check for updates' in the menu bar or turn this back on"))
        if key == "pairVia" and value in dict(PAIR_VIA):
            api("/api/settings", {"key": "pairVia", "value": value})
            return print(f"Pairing from: {dict(PAIR_VIA)[value]}")
        sys.exit(__doc__)
    s = state()
    via = choose("Which devices may ask to pair with this Mac? (A QR code shown on this Mac always works.)", PAIR_VIA, s.get("pairVia"))
    if via != s.get("pairVia"):
        api("/api/settings", {"key": "pairVia", "value": via})
    access = choose("What may Claude do for a paired device?", ACCESS, s.get("access"))
    if access != s.get("access"):
        set_access(access)
    cmd_status()


def cmd_tailscale():
    sys.path.insert(0, str(HERE))
    import tunnel
    try:
        cfg = json.loads(os.environ.get("REMOTECC_CONFIG") or "{}")
        host, login = tunnel.setup_ts_web(int(cfg.get("ts_web", 7781)))
    except Exception as e:
        sys.exit(f"Couldn't set it up: {e}")
    print(f"Done. On another computer signed in to Tailscale as {login or 'you'}: open https://remotecc.dev →")
    print(f"“Pair over Tailscale” → {host.rsplit(':', 1)[0]} → type the 4 digits in the RemoteCC dialog on this Mac.")
    subprocess.run(["bash", str(HERE / "restart.sh")])


def skill_install(quiet=False):
    if SKILL.exists() and MARK not in SKILL.read_text(errors="ignore"):
        return print(f"{SKILL} exists and isn't RemoteCC's — left alone.")
    SKILL.parent.mkdir(parents=True, exist_ok=True)
    SKILL.write_text(SKILL_TEXT)
    if not quiet:
        print(f"Claude Code skill installed: {SKILL}")


def skill_remove():
    if SKILL.exists() and MARK in SKILL.read_text(errors="ignore"):
        SKILL.unlink()
        try:
            SKILL.parent.rmdir()
        except OSError:
            pass
        print("Claude Code skill removed.")


def cmd_uninstall():
    if tty_input("Stop RemoteCC on this Mac and remove it (your data in ~/.remotecc stays)? [y/N] ").lower() != "y":
        return
    subprocess.run(["bash", str(HERE / "install.sh"), "uninstall"])
    skill_remove()
    for f in (HOME / ".local/bin").glob("remotecc*"):
        if "# RemoteCC (written by the bridge)" in f.read_text(errors="ignore"):
            f.unlink()
    print("RemoteCC removed. Delete ~/.remotecc to wipe pairing keys, secrets and artifacts too.")


def cmd_web(args):
    s = state()
    local, site = s.get("localWeb") or "", s.get("web") or "https://remotecc.dev"
    print("Two ways to open the RemoteCC web app:\n")
    print(f"  1. On this computer, served by RemoteCC itself: {local or '(off — set local_web in the bridge config)'}")
    print(f"     same code as the site, from the signed release installed here; pairs by itself, works without remotecc.dev")
    print(f"  2. From anywhere (phone, other computers): {site}")
    print("  On iPhone, the AI Code Remote app pairs with this same bridge: https://apps.apple.com/app/id6797019430\n")
    url = site if "--online" in args or not local else local
    opener = "open" if sys.platform == "darwin" else "xdg-open"
    try:
        subprocess.run([opener, url], capture_output=True, timeout=10)
        print("Opened", url)
    except (OSError, subprocess.TimeoutExpired):
        print("Open", url, "in a browser")


def main(argv):
    cmd, args = (argv[0] if argv else "help"), argv[1:]
    if cmd == "pair":
        cmd_pair()
    elif cmd == "web":
        cmd_web(args)
    elif cmd == "status":
        cmd_status()
    elif cmd == "devices":
        cmd_devices()
    elif cmd == "revoke" and args:
        cmd_revoke(" ".join(args))
    elif cmd == "settings":
        cmd_settings(args)
    elif cmd == "tailscale":
        cmd_tailscale()
    elif cmd == "skill" and args[:1] == ["install"]:
        skill_install()
    elif cmd == "skill" and args[:1] == ["remove"]:
        skill_remove()
    elif cmd == "uninstall":
        cmd_uninstall()
    else:
        print(__doc__.strip())


if __name__ == "__main__":
    main(sys.argv[1:])
