"""A session started in Claude Code's Code Mode can't be resumed with `claude -p`: the turn ends with a clear error
that says where it can be continued (not claude's raw stderr).  ~/.remotecc/venv/bin/python -I bridge/tests/code_mode.py"""
import os, pathlib, sys, uuid
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from harness import Bridge, check, done

fake = pathlib.Path("/tmp/remotecc-fake-claude-codemode")
fake.write_text("#!/bin/sh\necho \"Error: This session was started in Code Mode, which isn't available because "
                "it doesn't work with -p, so it can't be resumed.\" >&2\nexit 1\n")
fake.chmod(0o755)
b = Bridge(7799, "codemode", extra={"claude": str(fake)})
a = b.pair("Code Mode phone")
a.queue("cm-1", "hello", sid=str(uuid.uuid4()))
st, f = a.wait("cm-1", t=60)
err = f.get("error", {}).get("stringValue", "")
check("Code Mode session → error status", st == "error", st)
check("error explains it (terminal + new session), not claude's raw text", "only a terminal on the Mac" in err and "start a new session" in err, err)
# newer claude: a stream-json result "error_during_execution" with the reason only on stderr
fake.write_text("#!/bin/sh\necho \"Failed to resume session: This session was started in Code Mode (experimental), which is off "
                "in this run, so it can't be resumed.\" >&2\n"
                "echo '{\"type\":\"result\",\"subtype\":\"error_during_execution\",\"is_error\":true,\"session_id\":\"%s\"}'\nexit 1\n" % (sid2 := str(uuid.uuid4())))
a.queue("cm-2", "hello", sid=sid2)
st, f = a.wait("cm-2", t=60)
err = f.get("error", {}).get("stringValue", "")
check("bare error_during_execution → the stderr reason, explained", st == "error" and "only a terminal on the Mac" in err, err)
b.stop()
fake.unlink()

# a Code Mode transcript (newest repl-mode line true) resumes with Code Mode switched on; a normal one doesn't
import importlib.util, json, tempfile
spec = importlib.util.spec_from_file_location("rb", pathlib.Path(__file__).resolve().parents[1] / "remotecc_bridge.py")
rb = importlib.util.module_from_spec(spec); spec.loader.exec_module(rb)
tmp = pathlib.Path(tempfile.mkdtemp()); (tmp / "-p").mkdir(); rb.PROJECTS = tmp
line = lambda on: json.dumps({"type": "repl-mode", "replMode": on, "sessionId": "x"}, separators=(",", ":")) + "\n"
(tmp / "-p" / "cm.jsonl").write_text('{"type":"user"}\n' + line(True))
(tmp / "-p" / "off.jsonl").write_text(line(True) + line(False))
(tmp / "-p" / "plain.jsonl").write_text('{"type":"user"}\n')
args = rb.code_mode_args("cm")
check("Code Mode session → --settings env CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1",
      args[:1] == ["--settings"] and json.loads(args[1])["env"]["CLAUDE_CODE_EXPERIMENTAL_CODE_MODE"] == "1", args)
check("switched off later / plain / unknown session → nothing", rb.code_mode_args("off") == rb.code_mode_args("plain") == rb.code_mode_args("nope") == [])
done()
