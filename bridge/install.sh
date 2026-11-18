#!/usr/bin/env bash
# RemoteCC on this Mac: a private Python env + a per-user LaunchAgent (starts at login, restarts if it dies).
# Linux (Ubuntu): a systemd user service instead (remotecc-bridge.service, lingering so it runs without a login).
# Asks (in the terminal) where devices may pair from, what Claude may do, and whether to add the Claude Code skill;
# then shows a QR code to pair your phone (`remotecc pair`).
#   ./install.sh            install + start
#   ./install.sh menubar    remove the old menu bar agent (the updater runs this; the bridge keeps running)
#   ./install.sh uninstall  stop + remove the agent (your data in ~/.remotecc stays; delete that folder to wipe it)
set -euo pipefail
LABEL=dev.remotecc.bridge
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$HOME/Library/Logs/remotecc-bridge.log"
VENV="$HOME/.remotecc/venv"

LINUX=""; [[ "$(uname -s)" == Linux ]] && LINUX=1
WSL=""; grep -qi microsoft /proc/version 2>/dev/null && WSL=1
# WSL2 stops the whole Linux VM a little after its last Windows-side client exits — services don't count. A hidden
# `wsl.exe … sleep infinity`, started from the Windows Startup folder at every login, keeps the bridge reachable.
wsl_startup() {   # → the Windows Startup folder as a Linux path ("" if Windows interop isn't available)
  local appdata; appdata="$(cmd.exe /c 'echo %APPDATA%' 2>/dev/null | tr -d '\r')" || return 0
  [[ -n "$appdata" && "$appdata" != *%* ]] && wslpath "$appdata\\Microsoft\\Windows\\Start Menu\\Programs\\Startup" 2>/dev/null || true
}
wsl_keepalive() {
  local dir; dir="$(wsl_startup)"
  if [[ -z "$dir" || ! -d "$dir" ]]; then
    echo "note (WSL): Windows shuts WSL down when no Ubuntu window is open, and the bridge with it. Keep one open,"
    echo "      or see https://remotecc.dev/windows → 'Keep it running'."; return 0
  fi
  printf 'CreateObject("WScript.Shell").Run "wsl.exe -d %s --exec sleep infinity", 0, False\r\n' "${WSL_DISTRO_NAME:-Ubuntu}" > "$dir/remotecc-wsl.vbs"
  (cd /tmp && wscript.exe "$(wslpath -w "$dir/remotecc-wsl.vbs")" >/dev/null 2>&1 &) || true
  echo "  → WSL keeps running in the background (Windows Startup: remotecc-wsl.vbs) so your phone can reach this PC"
}
UNIT="$HOME/.config/systemd/user/remotecc-bridge.service"
if [[ -n "$LINUX" ]]; then
  LOG="$HOME/.remotecc/bridge.log"
  # over ssh `systemctl --user` can't find the user's manager without these
  export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
  export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}"
fi

# The old menu bar icon (dev.remotecc.menubar) is gone: pairing, devices and settings are `remotecc …` in a terminal,
# and a device asking to pair still gets the 4-digit dialog on this Mac (tunnel.py). Installs and updates remove it.
# `./install.sh menubar` is what an updating bridge runs (the new install.sh is already in place by then).
MLABEL=dev.remotecc.menubar
MPLIST="$HOME/Library/LaunchAgents/$MLABEL.plist"
no_menubar() {
  [[ -n "$LINUX" ]] && return 0
  [[ -n "${REMOTECC_NO_AGENT:-}" ]] || launchctl bootout "gui/$(id -u)/$MLABEL" 2>/dev/null || true
  rm -f "$MPLIST" "$DIR/remotecc_menubar.py"
}

if [[ "${1:-}" == "menubar" ]]; then
  no_menubar; exit 0
fi
if [[ -n "$LINUX" ]]; then
  [[ -n "${REMOTECC_NO_AGENT:-}" ]] || systemctl --user stop remotecc-bridge 2>/dev/null || true
  if [[ "${1:-}" == "uninstall" ]]; then
    systemctl --user disable remotecc-bridge 2>/dev/null || true
    rm -f "$UNIT"; systemctl --user daemon-reload; echo "removed remotecc-bridge.service (data kept in ~/.remotecc)"
    if [[ -n "$WSL" ]]; then d="$(wsl_startup)"; [[ -n "$d" ]] && rm -f "$d/remotecc-wsl.vbs"; fi
    exit 0
  fi
else
[[ -n "${REMOTECC_NO_AGENT:-}" ]] || launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
fi
if [[ "${1:-}" == "uninstall" ]]; then
  launchctl bootout "gui/$(id -u)/$MLABEL" 2>/dev/null || true
  rm -f "$PLIST" "$MPLIST"; echo "removed $LABEL (data kept in ~/.remotecc)"; exit 0
fi

command -v claude >/dev/null || [[ -x "$HOME/.local/bin/claude" ]] || echo "warning: Claude Code (claude) not found — install it first: https://claude.com/claude-code"
mkdir -p -m 700 "$HOME/.remotecc"
[[ -x "$VENV/bin/python" ]] || python3 -m venv "$VENV" || {
  rm -rf "$VENV"; echo "Python's venv module is missing. On Ubuntu/Debian: sudo apt install python3-venv — then run this again."; exit 1; }
"$VENV/bin/pip" install -q --disable-pip-version-check "cryptography>=42,<51" "websockets>=13,<18" "segno>=1.6,<2"   # capped: a new major never arrives unreviewed

# Questions — read from the terminal itself (under `curl … | bash` stdin is the script). No terminal / tests: defaults.
ask() {
  local a=""
  if [[ -z "${REMOTECC_NO_AGENT:-}" ]] && { : </dev/tty; } 2>/dev/null; then printf '%s' "$1" >/dev/tty; read -r a </dev/tty || a=""; fi
  echo "$a"
}
setting() { "$VENV/bin/python" -I -c 'import json,pathlib,sys,os
p = pathlib.Path.home() / ".remotecc/settings.json"
d = json.loads(p.read_text()) if p.exists() else {}
d[sys.argv[1]] = sys.argv[2]
p.write_text(json.dumps(d)); os.chmod(p, 0o600)' "$1" "$2"; }
if [[ ! -f "$HOME/.remotecc/settings.json" ]]; then
  cat <<'TXT'

  RemoteCC lets your phone (and browsers you pair) run Claude Code on this Mac — reading and changing files and running
  commands as your user. Only pair devices you own; revoke them any time with `remotecc devices` or the menu bar icon.

  Which devices may ask to pair with this Mac? (Scanning the QR code shown on this Mac always works.)
    1. Tailscale only      2. Same Wi-Fi only      3. Tailscale or same Wi-Fi (recommended)
    4. Anywhere — also pairing links sent over the internet
TXT
  case "$(ask '  Choose 1–4 [3]: ')" in 1) via=tailnet;; 2) via=wifi;; 4) via=any;; *) via=both;; esac
  cat <<'TXT'

  What may Claude do for a paired device?
    1. Full access (default) — runs `claude --dangerously-skip-permissions`: Claude runs ANY command without asking.
       It can delete files, install software and read anything your user can. Keep projects in git, with backups.
    2. Standard — runs `claude --permission-mode acceptEdits`: edits files in the project; scripts, installs and
       network commands are refused.
TXT
  access=full
  [[ "$(ask '  Choose 1–2 [1]: ')" == 2 ]] && access=standard
  setting pairVia "$via"; setting access "$access"
  echo "  → pairing from: $via · access: $access   (change later: remotecc settings)"
  if [[ -f "$DIR/MANIFEST.json" ]]; then
    echo "  → automatic updates: on — RemoteCC checks remotecc.dev about once an hour and installs new versions"
    echo "    signed by RemoteCC when no task is running. Turn off: menu bar icon, or remotecc settings auto-update off"
  fi
  skill="$(ask $'\n  Teach Claude Code about RemoteCC (adds the skill ~/.claude/skills/remotecc)? [Y/n] ')"
  # no one at the terminal: don't add it unasked (remotecc skill install does it later)
  if [[ -z "${REMOTECC_NO_AGENT:-}" ]] && { : </dev/tty; } 2>/dev/null && [[ "$skill" != [nN]* ]]; then
    "$VENV/bin/python" -I "$DIR/remotecc_cli.py" skill install || echo "  (skill not added — run remotecc skill install later)"
  fi
fi
if [[ -n "$LINUX" ]]; then
  mkdir -p "$(dirname "$UNIT")"
  cat > "$UNIT" <<UN
[Unit]
Description=RemoteCC bridge (phone ↔ Claude Code on this computer)
After=network-online.target

[Service]
ExecStart=$VENV/bin/python -I $DIR/remotecc_bridge.py
WorkingDirectory=$HOME
Environment=PATH=$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin
Restart=always
RestartSec=5
StandardOutput=append:$LOG
StandardError=append:$LOG

[Install]
WantedBy=default.target
UN
  if [[ -n "${REMOTECC_NO_AGENT:-}" ]]; then echo "(test: service not started)"; exit 0; fi
  loginctl enable-linger "$USER" 2>/dev/null || echo "note: runs only while you're logged in (loginctl enable-linger $USER needs admin)"
  systemctl --user daemon-reload
  systemctl --user enable --now remotecc-bridge
  [[ -n "$WSL" ]] && wsl_keepalive
  if command -v ufw >/dev/null && sudo -n ufw status 2>/dev/null | grep -q "Status: active" && ! sudo -n ufw status 2>/dev/null | grep -q 7789; then
    echo "note: the ufw firewall blocks phones on the same Wi-Fi (Tailscale still works). To allow them:"
    echo "      sudo ufw allow from 192.168.0.0/16 to any port 7789 proto tcp"
  fi
else
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>$VENV/bin/python</string><string>-I</string><string>$DIR/remotecc_bridge.py</string></array>
  <key>WorkingDirectory</key><string>$HOME</string>
  <key>EnvironmentVariables</key><dict>
    <key>PATH</key><string>$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>HOME</key><string>$HOME</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict></plist>
PL
if [[ -n "${REMOTECC_NO_AGENT:-}" ]]; then no_menubar; echo "(test: LaunchAgents not loaded)"; exit 0; fi   # installer test
launchctl bootstrap "gui/$(id -u)" "$PLIST"
no_menubar
fi
echo "RemoteCC running · log: $LOG"
echo "Commands: remotecc pair · remotecc status · remotecc devices · remotecc settings · remotecc uninstall"
# First install (nothing paired yet): show the QR right here, so the next step is just "scan it with the iPhone".
s=""
for _ in $(seq 1 30); do
  s="$(curl -fsS -m 2 http://127.0.0.1:7790/api/state 2>/dev/null)" && break; sleep 1
done
if [[ -n "$WSL" && -n "$s" ]] && command -v explorer.exe >/dev/null; then
  # Windows: the web app in the PC's own browser is the first client. WSL forwards localhost, so this local page hands
  # the browser an auto-approved pairing link (same as "Connect this Mac" on the web app's sign-in page).
  echo "Opening RemoteCC in your Windows browser — it pairs with this PC by itself."
  echo "(Didn't open? Go to http://127.0.0.1:7790/web in Edge or Chrome on this PC.  Phone: remotecc pair)"
  explorer.exe "http://127.0.0.1:7790/web" >/dev/null 2>&1 || true
else
  # Next step, written so a person or a Claude Code session running this installer can pass it straight on.
  echo
  echo "Next step: pair a browser or phone"
  echo "  • Browser on this computer: open https://remotecc.dev (or refresh it if it's already open) — it pairs by itself."
  [[ "$(uname)" == Darwin ]] && echo "    Safari: click “Connect RemoteCC on this Mac” on that page once."
  echo "  • Phone or another computer: run  remotecc pair  in a Terminal window here and scan the QR code."
  echo "    Same Wi-Fi / Tailscale instead: pick this computer on the phone, then type its 4-digit code in the dialog here."
  echo "  (If “remotecc” isn't found, open a new Terminal window or add ~/.local/bin to PATH.)"
  echo "Open source (Apache-2.0): https://github.com/Remotecc-dev/remotecc"
  if [[ "$s" == *'"devices": []'* ]] && { : </dev/tty; } 2>/dev/null; then
    echo
    "$VENV/bin/python" -I "$DIR/remotecc_cli.py" pair </dev/tty || true
  fi
fi
