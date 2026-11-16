// node --test test/*.test.mjs — RemoteCC web crypto/format against the Python bridge's wire format (Node has WebCrypto + streams).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { b64u, unb64u, seal, open, sessionKey, checkCode, parseQR, deflate, inflate, lanKey, tsHost } from "../public/tunnel.js";
import { encodeValue, decodeValue, Timestamp, Bytes } from "../public/fs.js";

const PY = process.env.PY || "python3";   // needs `cryptography`; e.g. PY=~/.remotecc/venv/bin/python
// Interop tests drive the Python bridge in ../../bridge (tunnel.py); skipped when the bridge isn't in this checkout.
const SKIP_BRIDGE = existsSync(new URL("../../bridge/remotecc_bridge.py", import.meta.url)) ? false : "bridge/remotecc_bridge.py not present";
const py = (code, input = "") => execFileSync(PY, ["-I", "-c", `import sys; sys.path.insert(0, "${new URL("../../bridge", import.meta.url).pathname}")\n` + code], { input }).toString();

test("parseQR: QR link, web fragment, junk", () => {
  const d = b64u(new TextEncoder().encode(JSON.stringify({ v: 1, r: "relay", room: "room1", k: "key", c: "code", n: "Mac của Leo" })));
  // clo2:// is a wire id — the iOS app depends on it
  for (const t of [`clo2://pair?d=${d}`, `https://remotecc.dev/#pair=${d}`, `https://remotecc.dev/?d=${d}`, `#pair=${d}`, `  clo2://pair?d=${d}  `]) assert.equal(parseQR(t)?.n, "Mac của Leo", t);
  assert.equal(parseQR("https://example.com/?x=1"), null);
  assert.equal(parseQR("#pair=!!!"), null);
});

test("deflate-raw round trip", async () => {
  const u = new TextEncoder().encode("xin chào ".repeat(1000));
  const z = await deflate(u);
  assert.ok(z.length < u.length / 10);
  assert.deepEqual(await inflate(z), u);
});

test("browser ↔ Mac: key, check code, frames both ways", { skip: SKIP_BRIDGE }, async () => {
  const mac = JSON.parse(py(`
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives import serialization
import json, tunnel as T
k = X25519PrivateKey.generate()
print(json.dumps({"priv": T.b64u(k.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())),
                  "pub": T.b64u(k.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw))}))`));
  const kp = await crypto.subtle.generateKey({ name: "X25519" }, false, ["deriveBits"]);
  const devPub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  const key = await sessionKey(kp.privateKey, devPub, unb64u(mac.pub));
  const frame = await seal(key, { text: "Xin chào Mac ✓", n: 1 });
  const out = JSON.parse(py(`
import json, sys, tunnel as T
m = json.loads(sys.stdin.read())
k = T.session_key({"priv": m["priv"], "pub": m["pub"]}, m["dev"])
got = T.open_frame(k, m["frame"])
print(json.dumps({"got": got, "check": T.check_code(m["pub"], m["dev"]), "reply": T.seal(k, {"id": "1", "status": 200, "body": {"x": "a" * 200000}})}))`,
    JSON.stringify({ ...mac, dev: b64u(devPub), frame })));
  assert.deepEqual(out.got, { text: "Xin chào Mac ✓", n: 1 });
  assert.equal(await checkCode(unb64u(mac.pub), devPub), out.check);
  const reply = await open(key, out.reply);
  assert.equal(reply.body.x.length, 200000);
  const bad = Uint8Array.from(atob(out.reply), (c) => c.charCodeAt(0)); bad[bad.length - 1] ^= 1;
  await assert.rejects(open(key, btoa(String.fromCharCode(...bad))));
});

test("fs.js value encoding matches the store", () => {
  const t = Timestamp.fromMillis(Date.UTC(2026, 9, 21, 8, 0, 0));
  const v = { a: 1, b: 1.5, c: "x", d: true, e: null, f: [1, "y"], g: { h: t }, i: Bytes.fromBase64String("AAE=") };
  const enc = encodeValue(v);
  assert.equal(enc.mapValue.fields.g.mapValue.fields.h.timestampValue, "2026-10-21T08:00:00.000Z");
  assert.equal(enc.mapValue.fields.a.integerValue, "1");
  const back = decodeValue(enc);
  assert.equal(back.g.h.toMillis(), t.toMillis());
  assert.equal(back.i.toBase64(), "AAE=");
  assert.deepEqual(back.f, [1, "y"]);
});

test("tsHost: Tailscale names the user may paste", () => {
  assert.equal(tsHost("my-mac.tail1234.ts.net"), "my-mac.tail1234.ts.net:8444");
  assert.equal(tsHost(" https://My-Mac.tail1234.ts.net/ "), "my-mac.tail1234.ts.net:8444");
  assert.equal(tsHost("my-mac.tail1234.ts.net:9000"), "my-mac.tail1234.ts.net:9000");
  for (const bad of ["", "100.64.83.65", "evil.com", "x.ts.net.evil.com", "a b.ts.net"]) assert.equal(tsHost(bad), "", bad);
});

test("direct path over Tailscale: web lanKey == bridge lan_key", { skip: SKIP_BRIDGE }, async () => {
  const raw = crypto.getRandomValues(new Uint8Array(32)), c = crypto.getRandomValues(new Uint8Array(16));
  const key = await lanKey(raw, c);
  const frame = await seal(key, { op: "auth", t: "xin chào" });
  const out = JSON.parse(py(`
import json, sys, tunnel as T
m = json.loads(sys.stdin.read())
k = T.lan_key(T.unb64u(m["raw"]), T.unb64u(m["c"]))
print(json.dumps({"got": T.open_frame(k, m["frame"]), "back": T.seal(k, {"op": "ok", "name": "Mac"})}))`,
    JSON.stringify({ raw: b64u(raw), c: b64u(c), frame })));
  assert.deepEqual(out.got, { op: "auth", t: "xin chào" });
  assert.deepEqual(await open(key, out.back), { op: "ok", name: "Mac" });
});
