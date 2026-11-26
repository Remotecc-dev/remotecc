// RemoteCC web ↔ the paired Mac through the relay, end-to-end encrypted. Same wire format as SuIn/Services/TunnelCrypto.swift
// and bridge/tunnel.py: key = HKDF-SHA256(X25519(device, Mac), salt "clo2-v1", info macPub ‖ devicePub) → AES-256-GCM;
// frame = base64(nonce 12 ‖ AES-GCM(raw-DEFLATE(JSON))). The device key lives in IndexedDB as PKCS#8 bytes (see "persistence" below).

const enc = new TextEncoder(), dec = new TextDecoder();
export const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const b64 = (b) => { let s = ""; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pipe(data, stream) { return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer()); }
export const deflate = (u8) => pipe(u8, new CompressionStream("deflate-raw"));
export const inflate = (u8) => pipe(u8, new DecompressionStream("deflate-raw"));

export async function sessionKey(devPriv, devPubRaw, macPubRaw) {
  const macPub = await crypto.subtle.importKey("raw", macPubRaw, { name: "X25519" }, false, []);
  const shared = await crypto.subtle.deriveBits({ name: "X25519", public: macPub }, devPriv, 256);
  const hk = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  const info = new Uint8Array([...macPubRaw, ...devPubRaw]);
  // wire id "clo2-v1" — the iOS app depends on it
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: enc.encode("clo2-v1"), info }, hk,
                                 { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function seal(key, obj) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, await deflate(enc.encode(JSON.stringify(obj))));
  const out = new Uint8Array(12 + ct.byteLength); out.set(nonce); out.set(new Uint8Array(ct), 12);
  return b64(out);
}

export async function open(key, data) {
  const raw = unb64(data);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, key, raw.slice(12));
  return JSON.parse(dec.decode(await inflate(new Uint8Array(plain))));
}

export async function checkCode(macPubRaw, devPubRaw) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array([...macPubRaw, ...devPubRaw])));
  return String((((h[0] << 24) >>> 0) + (h[1] << 16) + (h[2] << 8) + h[3]) % 10000).padStart(4, "0");
}

export function parseQR(text) {
  // https://remotecc.dev/?d=… (QR) · remotecc://pair?d=… (copied link) · https://remotecc.dev/#pair=… · #pair=…
  const t = String(text || "").trim();
  const m = t.match(/[?&#](?:pair|d)=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const p = JSON.parse(dec.decode(unb64u(m[1])));
    return p.v === 1 && p.r && p.room && p.k && p.c ? p : null;
  } catch { return null; }
}

// ------------------------------------------------------------ persistence (IndexedDB)
// The device's X25519 private key is stored as PKCS#8 bytes (`devKey`), not as a CryptoKey: WebKit (Safari, every iOS
// browser) writes a record holding an X25519 CryptoKey without an error but reads the WHOLE record back as null
// ("Unable to deserialize data") — the pairing was gone on every reload. Records made before this (Chrome/Firefox) hold
// a non-extractable CryptoKey in `devPriv` and keep working.
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("clo2", 1);   // local IndexedDB name (internal, per-origin)
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function kv(mode, fn) {
  const db = await idb();
  return new Promise((res, rej) => { const t = db.transaction("kv", mode); const q = fn(t.objectStore("kv")); t.oncomplete = () => res(q?.result); t.onerror = () => rej(t.error); });
}
const kvGet = (k) => kv("readonly", (s) => s.get(k));
const kvSet = (k, v) => kv("readwrite", (s) => s.put(v, k));
const kvDel = (k) => kv("readwrite", (s) => s.delete(k));

// Direct path over Tailscale (bridge/tunnel.py on_lan, reached through `tailscale serve` https): per-connection key =
// HKDF-SHA256(session key bytes, salt challenge, info "clo2-lan" — wire id, the iOS app depends on it), same frames as the relay.
async function sessionBits(devPriv, devPubRaw, macPubRaw) {
  const macPub = await crypto.subtle.importKey("raw", macPubRaw, { name: "X25519" }, false, []);
  const shared = await crypto.subtle.deriveBits({ name: "X25519", public: macPub }, devPriv, 256);
  const hk = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveBits"]);
  // wire id "clo2-v1" — the iOS app depends on it
  return crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: enc.encode("clo2-v1"), info: new Uint8Array([...macPubRaw, ...devPubRaw]) }, hk, 256);
}
export async function lanKey(sessionRaw, challenge) {
  const hk = await crypto.subtle.importKey("raw", sessionRaw, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: challenge, info: enc.encode("clo2-lan") }, hk,
                                 { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
// Tailscale HTTPS port 8444 = the bridge's `tailscale serve` port (RemoteCC)
// "my-mac.tail1234.ts.net", "https://…/", "…:8444" → "host:port"
export function tsHost(text) {
  const h = String(text || "").trim().replace(/^[a-z]+:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.ts\.net(:\d+)?$/.test(h)) return "";
  return /:\d+$/.test(h) ? h : h + ":8444";
}

// Macs on the owner's tailnet this browser has heard of (paired with, or listed by a paired Mac's op "peers"): the
// pairing page offers them, so nobody has to type a *.ts.net name. A browser can't list the tailnet by itself.
export function tsMacs() {
  try { const v = JSON.parse(localStorage.getItem("clo2.tsMacs") || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function rememberTs(name, text) {
  const host = tsHost(text);
  if (!host) return;
  const list = tsMacs().filter((m) => m.host !== host);
  list.unshift({ name: String(name || host.split(".")[0]).slice(0, 60), host, at: Date.now() });
  try { localStorage.setItem("clo2.tsMacs", JSON.stringify(list.slice(0, 12))); } catch {}
}

// ------------------------------------------------------------ the tunnel
export class Tunnel extends EventTarget {
  constructor() {
    super(); this.p = null; this.key = null; this.ws = null; this.relayOnline = false; this.waiters = new Map(); this.retries = 0;
    this.offTimer = 0; this.direct = null; this.dws = null; this.dTimer = 0; this.lastNotice = 0;
    // Watchdog: a link sometimes goes deaf (socket "open" but nothing comes back). A request unanswered for 15 s → drop
    // the socket it went on; the other path / the reconnect resends everything in flight (the Mac answers a repeat id
    // from its cache, whichever path it came by).
    const tick = setInterval(() => {
      const now = Date.now();
      for (const w of this.waiters.values()) {
        if (now - w.sentAt <= 15_000 || w.kicked) continue;
        w.kicked = true;
        if (w.path === "direct" && this.direct) { try { this.direct.ws.close(); } catch {} return; }
        if (w.path === "relay" && this.ws?.readyState === 1 && this.relayOnline) { try { this.ws.close(); } catch {} return; }
      }
    }, 3000);
    tick?.unref?.();   // Node (tests): don't keep the process alive
  }
  // Online = the relay says the Mac is there, or the direct Tailscale link is up.
  get macOnline() { return this.relayOnline || !!this.direct; }

  // ---- optional PIN lock (set when pairing or later): the saved pairing (device key + token) is AES-GCM-encrypted with a
  // key derived from the PIN (PBKDF2-SHA256, 310k rounds); an "unlock" record keeps that key (non-extractable) until the
  // browser has been idle `hours` — then the PIN is asked again. 10 wrong PINs forget the Mac. A 4-6 digit PIN guards
  // against someone picking up the device, not against an attacker who copies the browser's storage.
  async pinKey(pin, salt) {
    const base = await crypto.subtle.importKey("raw", enc.encode(String(pin)), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 310_000 }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async seal(p) {   // the pairing as stored: plain, or encrypted when a PIN is set
    if (!this.lockKey) return p;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = enc.encode(JSON.stringify({ ...p, devKey: p.devKey ? b64u(p.devKey) : undefined, devPriv: undefined }));
    const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, this.lockKey, plain));
    return { locked: { salt: this.lockSalt, iv, data, hours: this.lockHours }, macName: p.macName, token: p.token };
  }
  async save() { if (this.p) await kvSet("pairing", await this.seal(this.p)); }
  async openLocked(rec, key) {
    const raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: rec.locked.iv }, key, rec.locked.data);   // wrong key → throws
    const p = JSON.parse(dec.decode(raw));
    if (p.devKey) p.devKey = unb64u(p.devKey);
    this.lockKey = key; this.lockSalt = rec.locked.salt; this.lockHours = rec.locked.hours || 4;
    return p;
  }
  get pinSet() { return !!this.lockKey; }
  get lockedName() { return this.lockedRec?.macName || "Mac"; }
  async setPin(pin, hours = 4) {   // pin "" → remove
    if (!this.p) throw new Error("Chưa ghép với Mac nào");
    if (pin && !this.p.devKey) throw new Error("Ghép lại Mac này một lần để đặt mã khoá (lần ghép cũ lưu khoá theo kiểu khác)");
    if (!pin) { this.lockKey = null; await kvDel("unlock"); return this.save(); }
    if (!/^\d{4,6}$/.test(pin)) throw new Error("Mã khoá gồm 4–6 chữ số");
    this.lockSalt = crypto.getRandomValues(new Uint8Array(16)); this.lockHours = hours;
    this.lockKey = await this.pinKey(pin, this.lockSalt);
    await this.save(); await this.touch(true);
  }
  async touch(force) {   // activity: the unlock lasts `hours` more
    if (!this.lockKey) return;
    const now = Date.now();
    if (!force && now - (this.touched || 0) < 60_000) return;
    this.touched = now;
    await kvSet("unlock", { key: this.lockKey, until: now + this.lockHours * 3600_000 });
  }
  async unlock(pin) {
    const rec = this.lockedRec;
    if (!rec) return false;
    let p;
    try { p = await this.openLocked(rec, await this.pinKey(pin, rec.locked.salt)); }
    catch {
      const n = Number(localStorage.getItem("rcc.pinFails") || 0) + 1;
      localStorage.setItem("rcc.pinFails", String(n));
      if (n >= 10) { localStorage.removeItem("rcc.pinFails"); await kvDel("pairing"); await kvDel("unlock"); this.lockedRec = null; throw new Error("Sai mã 10 lần — trình duyệt đã quên Mac này. Ghép lại."); }
      throw new Error(`Sai mã khoá (còn ${10 - n} lần)`);
    }
    localStorage.removeItem("rcc.pinFails");
    this.lockedRec = null;
    await this.use(p); await this.touch(true);
    return true;
  }
  async use(p) {
    this.p = p;
    this.priv = p.devKey ? await crypto.subtle.importKey("pkcs8", p.devKey, { name: "X25519" }, false, ["deriveBits"]) : p.devPriv;
    this.key = await sessionKey(this.priv, unb64u(p.devPub), unb64u(p.macPub));
  }
  async lockNow() { await kvDel("unlock"); }
  async unlockValid() { const u = await kvGet("unlock").catch(() => null); return !!(u && u.until > Date.now()); }

  /** true = ready, false = not paired, "locked" = paired with a PIN, idle too long: unlock(pin) first. */
  async load() {
    const rec = (await kvGet("pairing")) || null;
    if (rec?.locked) {
      const u = await kvGet("unlock").catch(() => null);
      if (u?.key && u.until > Date.now()) {
        try { await this.use(await this.openLocked(rec, u.key)); await this.touch(true); return true; } catch {}
      }
      await kvDel("unlock").catch(() => {});
      this.lockedRec = rec;
      return "locked";
    }
    this.p = rec;
    if (this.p) {
      this.priv = this.p.devKey ? await crypto.subtle.importKey("pkcs8", this.p.devKey, { name: "X25519" }, false, ["deriveBits"]) : this.p.devPriv;
      this.key = await sessionKey(this.priv, unb64u(this.p.devPub), unb64u(this.p.macPub));
    }
    return !!this.p;
  }
  get paired() { return !!this.p; }
  get macName() { return this.p?.macName || "Mac"; }
  get path() { return this.direct ? "Tailscale" : this.relayOnline ? "relay" : ""; }
  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  // Pairing link/QR → hello; onCheck(code) right away; resolves once the Mac approves.
  async pair(qr, name, onCheck, extra = {}) {
    // Extractable only to export it once for storage (see "persistence"); after a reload it is imported non-extractable.
    const kp = await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);
    const devKey = new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
    const devPub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
    const macPub = unb64u(qr.k), key = await sessionKey(kp.privateKey, devPub, macPub);
    onCheck?.(await checkCode(macPub, devPub));
    // wire id — relay path /room/<id>?role=… — the iOS app depends on it
    const ws = new WebSocket(`wss://${qr.r}/room/${qr.room}?role=dev&token=${qr.c}`);
    return new Promise((resolve, reject) => {
      const fail = (m) => { try { ws.close(); } catch {} reject(new Error(m)); };
      const timer = setTimeout(() => fail("Hết thời gian chờ Mac cho phép"), 300_000);
      ws.onerror = () => fail("Mã ghép hết hạn hoặc không hợp lệ — tạo mã mới trên Mac");
      ws.onopen = async () => ws.send(JSON.stringify({ pub: b64u(devPub), data: await seal(key, { op: "hello", name, keep: this.keepDays ?? 30, ...(qr.a ? { a: qr.a } : {}) }) }));
      ws.onmessage = async (e) => {
        const m = JSON.parse(e.data);
        if (m.op === "presence" && m.mac === false) return fail("Mac đang offline — mở RemoteCC trên Mac rồi thử lại");
        if (!m.data) return;
        let r; try { r = await open(key, m.data); } catch { return; }
        if (r.op === "denied") { clearTimeout(timer); return fail("Mac đã từ chối trình duyệt này"); }
        if (r.op === "paired" && r.token) {
          clearTimeout(timer); ws.close();
          this.p = { relay: qr.r, room: qr.room, macPub: qr.k, macName: r.name || qr.n, token: r.token, devKey, devPub: b64u(devPub), ...extra };
          this.priv = kp.privateKey;
          this.lockKey = null;
          await this.save();
          this.key = key;
          this.connect();
          resolve();
        }
      };
    });
  }

  // Another computer on the owner's tailnet: ask the Mac at https://<mac>.ts.net:8444 directly. The Mac checks the
  // Tailscale identity and shows a dialog where the owner types the 4-digit code shown here; then it hands back a
  // pairing link sealed to this browser's key, and pairing finishes through the relay like a scanned QR.
  async pairTailscale(host, name, onCheck) {
    const kp = await crypto.subtle.generateKey({ name: "X25519" }, false, ["deriveBits"]);
    const devPub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
    // iOS cuts a page's sockets when the user switches apps (e.g. to read the code out): the Mac keeps the dialog (and,
    // once approved, the link for this key) a while, so come back with the same key instead of failing.
    const link = await new Promise((resolve, reject) => {
      let ws, key, settled = false, reached = false, tries = 0;
      const timer = setTimeout(() => fail("Hết thời gian chờ Mac cho phép"), 300_000);
      const fail = (m) => { if (settled) return; settled = true; clearTimeout(timer); document.removeEventListener("visibilitychange", back); try { ws.close(); } catch {} reject(new Error(m)); };
      const unreachable = () => fail(/iPhone|iPad/.test(navigator.userAgent)
        ? `Không kết nối được ${host} — bật Tailscale cùng tài khoản với Mac, và bật “Use Tailscale DNS” trong app Tailscale`
        : /Chrome\/|Edg\//.test(navigator.userAgent)
          ? `Không kết nối được ${host} — bật Tailscale cùng tài khoản với Mac; khi Chrome hỏi quyền truy cập mạng cục bộ (Local network access), bấm Cho phép`
          : `Không kết nối được ${host} — máy này có đang bật Tailscale cùng tài khoản với Mac không?`);
      const again = () => {   // lost the socket after reaching the Mac: retry now if visible, else when the page is back
        if (settled) return;
        if (++tries > 20) return fail("Mất kết nối tới Mac khi đang chờ");
        if (document.hidden) return;
        setTimeout(open1, 800);
      };
      const back = () => { if (!document.hidden && !settled && (!ws || ws.readyState > 1)) open1(); };
      document.addEventListener("visibilitychange", back);
      const open1 = () => {
        if (settled) return;
        let w;
        try { w = ws = new WebSocket(`wss://${host}`); } catch { return fail("Địa chỉ Mac không hợp lệ"); }
        w.onerror = () => { if (!reached) unreachable(); };
        w.onclose = (e) => {
          if (ws !== w || settled) return;
          if (e.code === 4003) return fail("Mac đã từ chối (khác tài khoản Tailscale, hoặc Mac chỉ cho ghép qua Wi-Fi)");
          if (e.code === 4008) return fail("Hết thời gian chờ nhập mã trên Mac");
          if (!reached) return unreachable();
          again();
        };
        w.onmessage = async (e) => {
          const m = JSON.parse(e.data);
          if (m.op === "challenge" && m.k) {
            reached = true;
            if (!key) {
              const macPub = unb64u(m.k);
              key = await sessionKey(kp.privateKey, devPub, macPub);
              onCheck?.(await checkCode(macPub, devPub), m.n);
            }
            w.send(JSON.stringify({ op: "pairreq", pub: b64u(devPub), name, app: "web" }));
          } else if (m.op === "denied") fail("Mac đã từ chối trình duyệt này");
          else if (m.op === "pairlink" && key) {
            let r; try { r = await open(key, m.data); } catch { return fail("Liên kết ghép hỏng"); }
            settled = true; clearTimeout(timer); document.removeEventListener("visibilitychange", back);
            w.onclose = null; w.close(); resolve(r.link);
          }
        };
      };
      open1();
    });
    const qr = parseQR(link);
    if (!qr) throw new Error("Liên kết ghép hỏng");
    return this.pair(qr, name, null, { ts: host });
  }

  async forget() {
    try { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ data: await seal(this.key, { op: "forget" }) })); } catch {}
    this.wipe();
  }
  async wipe() {
    try { this.ws?.close(); } catch {}
    this.dropDirect(true);
    const mine = this.p?.token;
    this.ws = null; this.p = null; this.key = null; this.priv = null; this.relayOnline = false; this.lastNotice = 0;
    // Only our own pairing: an old tab (revoked, or still on old code) must not erase the one a newer tab just made.
    try { const saved = await kvGet("pairing"); if (!saved || !mine || saved.token === mine) { await kvDel("pairing"); await kvDel("unlock"); } } catch {}
    this.lockKey = null;
    this.failAll("Đã quên máy Mac");
    this.emit("unpaired");
  }

  async checkToken() {
    if (this.checking || !this.p) return;
    this.checking = true;
    try {
      const p = this.p;
      const r = await fetch(`https://${p.relay}/room/${p.room}?role=dev&check=1&token=${encodeURIComponent(p.token)}`, { cache: "no-store" });
      if (r.status === 403 && this.p === p) return this.wipe();
    } catch {} finally { this.checking = false; }
  }

  connect() {
    if (!this.p || (this.ws && this.ws.readyState <= 1)) return;
    this.connectDirect();
    const ws = new WebSocket(`wss://${this.p.relay}/room/${this.p.room}?role=dev&token=${this.p.token}`);
    this.ws = ws;
    let opened = false;
    ws.onopen = () => { opened = true; };
    ws.onmessage = async (e) => {
      const m = JSON.parse(e.data);
      if (m.op === "presence") {
        this.retries = 0; this.relayOnline = !!m.mac;
        clearTimeout(this.offTimer);
        // The Mac's own relay link blips every so often and is back in seconds: keep requests, fail only after 10 s.
        if (!this.macOnline) this.offTimer = setTimeout(() => { if (!this.macOnline) this.failAll("Mac đang offline"); }, 10_000);
        else { this.resendAll(); if (!this.asked) this.learnTs(); }
        return this.emit("presence", this.macOnline);
      }
      if (!m.data) return;
      let r; try { r = await open(this.key, m.data); } catch { return; }
      this.answer(r);
    };
    ws.onclose = (e) => {
      if (this.ws !== ws) return;
      this.ws = null; this.relayOnline = false; this.emit("presence", this.macOnline);
      // Revoked / reset on the Mac (4001). A socket that never opened is usually the network (iOS drops sockets of a
      // page in the background; offline; relay hiccup): forget the Mac only when the relay says the token is refused.
      if (e.code === 4001) return this.wipe();
      if (!opened && this.retries >= 2) this.checkToken();
      // Requests in flight stay: they go again once the Mac is back (each keeps its own timeout).
      if (this.direct) this.resendAll();
      const delay = opened ? 300 : Math.min(30_000, 2000 * 2 ** Math.min(this.retries++, 4));
      setTimeout(() => this.connect(), delay);
    };
  }

  answer(r) {
    if (r?.op === "changed") {
      this.lastNotice = Date.now();
      return this.emit("changed", Array.isArray(r.paths) ? r.paths : []);
    }
    if (!r?.id) return;
    const w = this.waiters.get(r.id);
    if (w) { this.waiters.delete(r.id); clearTimeout(w.timer); w.resolve(r); }
  }

  // The Mac's Tailscale https name (bridge op "lan" → ts), so a browser paired by QR / on the Mac itself goes direct too.
  async learnTs() {
    this.asked = true;
    try {
      const r = await this.send({ op: "lan" }, 15_000);
      const host = tsHost(r.body?.ts);
      if (host) rememberTs(this.macName, host);
      if (host && this.p && !this.p.ts) { this.p = { ...this.p, ts: host }; await this.save(); this.connectDirect(); }
    } catch {}
    try {   // the owner's other Macs running RemoteCC: one tap to pair this browser with them later
      const r = await this.send({ op: "peers" }, 30_000);
      for (const m of r.body?.macs || []) if (m.ts) rememberTs(m.name, m.ts);
    } catch {}
  }

  connectDirect() {
    clearTimeout(this.dTimer);
    if (!this.p?.ts || this.dws) return;
    let ws;
    try { ws = new WebSocket(`wss://${this.p.ts}`); } catch { return; }
    this.dws = ws;
    let key = null;
    const give = setTimeout(() => { try { ws.close(); } catch {} }, 8000);   // not on the tailnet now: the name doesn't answer
    ws.onmessage = async (e) => {
      const m = JSON.parse(e.data);
      if (m.op === "challenge" && m.c && !key) {
        const raw = await sessionBits(this.priv, unb64u(this.p.devPub), unb64u(this.p.macPub));
        key = await lanKey(raw, unb64u(m.c));
        return ws.send(JSON.stringify({ pub: this.p.devPub, data: await seal(key, { op: "auth" }) }));
      }
      if (!m.data || !key) return;
      let r; try { r = await open(key, m.data); } catch { return; }
      if (r.op === "ok" && !this.direct) {
        clearTimeout(give);
        this.direct = { ws, key };
        this.resendAll();
        return this.emit("presence", this.macOnline);
      }
      this.answer(r);
    };
    ws.onclose = () => {
      clearTimeout(give);
      if (this.dws !== ws) return;
      const was = !!this.direct;
      this.dws = null; this.direct = null;
      if (!this.p) return;
      if (was) { this.emit("presence", this.macOnline); this.resendAll(); }
      this.dTimer = setTimeout(() => this.connectDirect(), was ? 1000 : 30_000);
    };
  }
  dropDirect(stop) {
    clearTimeout(this.dTimer);
    const ws = this.dws; this.dws = null; this.direct = null;
    try { ws?.close(); } catch {}
    if (!stop) this.connectDirect();
  }

  async transmit(w) {
    w.sentAt = Date.now(); w.kicked = false;
    if (this.direct) {
      const d = this.direct; w.path = "direct";
      return d.ws.send(JSON.stringify({ data: await seal(d.key, w.obj) }));
    }
    if (this.ws?.readyState === 1 && this.relayOnline) {
      w.path = "relay";
      return this.ws.send(JSON.stringify({ data: await seal(this.key, w.obj) }));
    }
    w.path = "";   // no path now: goes out with resendAll() once one is up
  }
  resendAll() { for (const w of this.waiters.values()) this.transmit(w).catch(() => {}); }

  failAll(msg) { for (const [id, w] of this.waiters) { clearTimeout(w.timer); w.reject(new Error(msg)); } this.waiters.clear(); }

  async send(fields, timeout = 60_000) {
    if (!this.p) throw new Error("Chưa ghép với Mac nào");
    if (!this.ws || this.ws.readyState > 1) this.connect();
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.waiters.delete(id); reject(new Error(this.macOnline ? "Mac không trả lời" : "Mac đang offline")); }, timeout);
      const w = { resolve, reject, timer, obj: { ...fields, id }, sentAt: Date.now(), kicked: false, path: "" };
      this.waiters.set(id, w);
      this.transmit(w).catch(() => {});
    });
  }

  // Firestore-REST-shaped request to the Mac's store → {status, body}
  request(method, url, body, timeout) { return this.send(body === undefined ? { method, url } : { method, url, body }, timeout); }

  // Tunnel op the Mac handles itself (upload / secret.* / artifact) → body; non-200 throws its error text.
  async op(name, fields = {}, timeout = 60_000) {
    const r = await this.send({ ...fields, op: name }, timeout);
    if (r.status !== 200) throw new Error(r.body?.error || `Mac báo lỗi ${r.status}`);
    return r.body;
  }
}

export const tunnel = new Tunnel();
