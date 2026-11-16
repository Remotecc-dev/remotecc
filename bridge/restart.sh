#!/bin/bash
# Safe RemoteCC bridge restart: it takes no new turns, exits once running ones finish, launchd/systemd starts the new code.
label=dev.remotecc.bridge
if [[ "$(uname -s)" == Linux ]]; then
  export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
  pid=$(systemctl --user show -p MainPID --value remotecc-bridge 2>/dev/null)
else
  pid=$(launchctl list | awk -v l=$label '$3==l {print $1}')
fi
if [[ -n $pid && $pid != 0 && "$(cat ~/.remotecc/graceful 2>/dev/null)" == "$pid" ]]; then
  [[ -e ~/.remotecc/restart ]] || touch ~/.remotecc/restart
  echo "RemoteCC bridge restart requested (after running turns finish)"
elif [[ "$(uname -s)" == Linux ]]; then
  systemctl --user restart remotecc-bridge && echo "RemoteCC bridge restarted"
else
  launchctl kickstart -k gui/$(id -u)/$label && echo "RemoteCC bridge restarted"
fi
