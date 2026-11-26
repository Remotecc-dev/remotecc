// RemoteCC web — the paired Mac's store (same document shapes as the app) through the end-to-end encrypted tunnel.
// No account and no cloud data: fs.js answers the Firestore SDK calls below from the Mac.
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, query, where, getDocs, getDoc, Timestamp, Bytes, writeBatch } from "./fs.js";
import { tunnel, parseQR, tsHost, tsMacs, rememberTs } from "./tunnel.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked@14.1.4/lib/marked.esm.js";
import DOMPurify from "https://cdn.jsdelivr.net/npm/dompurify@3.2.4/dist/purify.es.mjs";
import { createVibe, handIcon } from "./vibe.js";
import { startI18n, tr, EN, LOCALE } from "./i18n.js";
import { initTheme } from "./theme.js";
startI18n();
initTheme();


const db = getFirestore();
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const uuid = () => crypto.randomUUID().toUpperCase();   // iOS uses UUID().uuidString (upper-case)
const now = () => Timestamp.now();

// Line icons (Lucide paths, MIT) instead of emoji.
const ICONS = {
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  speaker: '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
  newchat: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>',
  sidebar: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
  terminal: '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
  branch: '<path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  send: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
};
function svg(name, size = 16) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor",
    "stroke-width": 1.75, "stroke-linecap": "round", "stroke-linejoin": "round", class: "ic" })) s.setAttribute(k, v);
  s.innerHTML = ICONS[name] || "";
  return s;
}
document.querySelectorAll("[data-icon]").forEach((e) => e.replaceChildren(svg(e.dataset.icon, e.id === "send" ? 18 : 16)));
// Icon button; `title` doubles as the accessible label.
function ibtn(name, fn, title, cls = "") { const b = el("button", "ibtn " + cls); b.title = title; b.setAttribute("aria-label", title); b.append(svg(name)); b.onclick = () => fn(b); return b; }

const S = {
  uid: null, convos: new Map(), terminal: [], termPins: new Set(),
  view: { kind: "new", id: null },     // new | chat | terminal
  messages: [], images: new Map(),     // messageId → [dataURL]
  inbox: [], session: null, bridges: [], secrets: new Map(), shares: [], vault: null, newReqs: [], branchRuns: [], files: [], seen: {}, envs: [],
  unsub: [], viewUnsub: [], pending: [], streaming: null, audio: null,
  localReqs: new Map(),                // sent from this tab, not yet in the Mac's inbox list → shown right away
};

// ---------------------------------------------------------------- render guard
// The open session is polled every 1.5 s. Rebuilding the DOM while a button is held down swallows the click (the button
// under the pointer at mouseup is a new node), and wipes a text selection. So: hold renders while the pointer is down or
// text is selected in that pane, then render once.
const held = { down: false, due: new Set() };
function guarded(paneId, fn) {
  if (held.down || selectedIn(paneId)) { held.due.add(fn); return true; }
  return false;
}
function selectedIn(id) {
  const sel = document.getSelection();
  return !!(sel && !sel.isCollapsed && sel.anchorNode && $(id)?.contains(sel.anchorNode));
}
function flushHeld() {
  if (held.down) return;
  for (const fn of [...held.due]) { held.due.delete(fn); fn(); }
}
document.addEventListener("pointerdown", () => { held.down = true; }, true);
for (const t of ["pointerup", "pointercancel"]) document.addEventListener(t, () => { held.down = false; setTimeout(flushHeld, 0); }, true);
document.addEventListener("selectionchange", () => { if (held.due.size && !held.down && document.getSelection()?.isCollapsed) flushHeld(); });

// ---------------------------------------------------------------- pairing gate (no account: this browser is paired with one Mac)
function browserName() {
  const ua = navigator.userAgent;
  const b = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : "";
  return os ? `${b} on ${os}` : b;   // shown in the Mac's pairing dialog and device list (English, like the dialog)
}
function showPairing(msg = "") {
  S.unsub.forEach((u) => u()); S.unsub = [];
  $("app").classList.add("hidden"); $("login").classList.remove("hidden");
  $("pair-check").classList.add("hidden"); $("login-error").textContent = msg;
  renderTsMacs();
}
// Macs this browser heard of on the tailnet (tunnel.js tsMacs): tap one instead of typing its *.ts.net name.
function renderTsMacs() {
  const box = $("ts-macs");
  box.replaceChildren(...tsMacs().map((m) => {
    const b = el("button", "ts-mac");
    b.append(el("span", "", "🖥️"), el("span"), el("span", "tm-go", "Ghép"));
    b.children[1].append(el("span", "tm-name", m.name), el("span", "tm-host", m.host.replace(/:8444$/, "")));
    b.onclick = () => pairTs(m.host, m.name);
    return b;
  }));
}
const showStatus = () => $("pair-status").scrollIntoView({ behavior: "smooth", block: "center" });
// A link from the Mac's own screen (QR) carries `a`: the Mac approves it at once, so the phone is where the user
// confirms ("Connect this browser to <Mac>?") — nothing to type on the Mac. Links sent around (no `a`) keep the
// 4-digit check in the Mac's dialog.
function askConnect(name) {
  return new Promise((resolve) => {
    $("pair-confirm-name").textContent = name || "Mac";
    $("pair-confirm").classList.remove("hidden"); showStatus();
    // iPhone/iPad with the app: hand the same link to it (remotecc:// opens RemoteCC)
    const d = $("pair-link").value.match(/[?&#](?:pair=|d=)([A-Za-z0-9_-]+)/)?.[1];
    $("pair-app").classList.toggle("hidden", !(d && /iPhone|iPad/.test(navigator.userAgent)));
    if (d) $("pair-app").href = "remotecc://pair?d=" + d;
    const done = (ok) => { $("pair-confirm").classList.add("hidden"); resolve(ok); };
    $("pair-yes").onclick = () => done(true); $("pair-no").onclick = () => done(false);
  });
}
async function pairNow(opts) {
  $("login-error").textContent = "";
  const qr = parseQR($("pair-link").value);
  if (!qr) { $("login-error").textContent = "Đây không phải liên kết ghép của RemoteCC."; showStatus(); return; }
  if (qr.a && opts?.local !== true && !(await askConnect(qr.n))) { $("pair-link").value = ""; return; }
  $("signin").disabled = true;
  if (qr.a) { $("login-error").textContent = "Đang kết nối…"; showStatus(); }
  try {
    await tunnel.pair(qr, browserName(), (code) => { if (qr.a) return; $("pair-code").textContent = code; $("pair-check").classList.remove("hidden"); showStatus(); });
    $("login-error").textContent = "";
    $("pair-link").value = "";
    await pinAfterPair();
    start();
  } catch (e) { $("pair-check").classList.add("hidden"); $("login-error").textContent = e.message; }
  finally { $("signin").disabled = false; }
}
async function pairTs(picked, pickedName) {
  $("login-error").textContent = "";
  const host = typeof picked === "string" ? picked : tsHost($("ts-host").value);
  if (!host) { $("login-error").textContent = "Tên Tailscale của máy có dạng ten-may.tailxxxx.ts.net"; showStatus(); return; }
  const btns = [$("ts-pair"), ...$("ts-macs").querySelectorAll("button")];
  btns.forEach((b) => { b.disabled = true; });
  $("login-error").textContent = `Đang kết nối ${pickedName || host.replace(/:8444$/, "")}…`; showStatus();
  try {
    await tunnel.pairTailscale(host, browserName(), (code, mac) => {
      $("pair-code").textContent = code; $("pair-check").classList.remove("hidden");
      $("login-error").textContent = `Nhập mã này trong hộp thoại RemoteCC trên ${mac || "Mac"}`;
      rememberTs(mac || pickedName, host);
      showStatus();
    });
    $("login-error").textContent = "";
    $("ts-host").value = "";
    await pinAfterPair();
    start();
  } catch (e) { $("pair-check").classList.add("hidden"); $("login-error").textContent = e.message; showStatus(); }
  finally { btns.forEach((b) => { b.disabled = false; }); renderTsMacs(); }
}
// How long the Mac keeps this browser paired (bridge: expiresAt; then it's removed and this page shows pairing again).
try { const k = localStorage.getItem("clo2.keepDays"); if (k !== null && $("keep-days").querySelector(`option[value="${k}"]`)) $("keep-days").value = k; } catch {}
tunnel.keepDays = Number($("keep-days").value);
$("keep-days").onchange = () => { tunnel.keepDays = Number($("keep-days").value); try { localStorage.setItem("clo2.keepDays", $("keep-days").value); } catch {} };
$("ts-pair").onclick = () => pairTs();
$("ts-host").onkeydown = (e) => { if (e.key === "Enter") pairTs(); };
try {   // the name typed before this list existed
  const old = localStorage.getItem("clo2.tsHost");
  if (old) { rememberTs("", old); localStorage.removeItem("clo2.tsHost"); }
} catch {}
$("signin").onclick = pairNow;
// Scan the Mac's pairing QR with this device's camera (phones, laptops). BarcodeDetector where the browser has it
// (Chrome/Edge/Android), else jsQR on canvas frames (Safari/iOS, Firefox). The QR holds the same pairing link as
// "Copy pairing link", so it then pairs exactly like a pasted link (4-digit check on the Mac).
const qrScan = { stream: null, timer: 0 };
function qrStop() {
  clearTimeout(qrScan.timer); qrScan.timer = 0;
  qrScan.stream?.getTracks().forEach((t) => t.stop()); qrScan.stream = null;
  $("qr-box").classList.add("hidden"); $("qr-scan").classList.remove("hidden");
}
// QR decoder for a video frame or an image: BarcodeDetector where the browser has it, else jsQR on a canvas.
// The pairing QR is dense (~70 modules), so jsQR alternates between a full-resolution centre crop (where the scan frame
// is) and the whole picture scaled down — a phone camera at a normal distance makes the code too small otherwise.
async function qrDecoder() {
  if ("BarcodeDetector" in window && (await BarcodeDetector.getSupportedFormats().catch(() => [])).includes("qr_code")) {
    const bd = new BarcodeDetector({ formats: ["qr_code"] });
    return async (src) => (await bd.detect(src))[0]?.rawValue || "";
  }
  const jsQR = (await import("https://cdn.jsdelivr.net/npm/jsqr@1.4.0/+esm")).default;
  const c = document.createElement("canvas"), g = c.getContext("2d", { willReadFrequently: true });
  const read = (src, sx, sy, sw, sh, max, invert) => {
    const k = Math.min(1, max / Math.max(sw, sh)); c.width = Math.round(sw * k); c.height = Math.round(sh * k);
    g.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: invert ? "attemptBoth" : "dontInvert" })?.data || "";
  };
  let turn = 0;
  return async (src) => {
    const w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
    if (!w || !h) return "";
    const still = !src.videoWidth, side = Math.round(Math.min(w, h) * 0.75), cx = (w - side) / 2, cy = (h - side) / 2;
    if (still) return read(src, 0, 0, w, h, 1600, true) || read(src, cx, cy, side, side, 1200, true)
      || read(src, 0, 0, w, h, 800, true);
    return (turn++ % 2) ? read(src, 0, 0, w, h, 1024, false) : read(src, cx, cy, side, side, 1000, false);
  };
}
function qrFound(text) {
  if (!parseQR(text)) { $("login-error").textContent = "Mã QR này không phải của RemoteCC."; showStatus(); return false; }
  $("pair-link").value = text; pairNow(); return true;
}
async function qrUploaded(file) {
  $("login-error").textContent = "";
  try {
    const url = URL.createObjectURL(file), img = new Image();
    img.src = url; await img.decode();
    const text = await (await qrDecoder())(img); URL.revokeObjectURL(url);
    if (!text) { $("login-error").textContent = "Không đọc được mã QR trong ảnh này."; showStatus(); return; }
    qrFound(text);
  } catch (e) { $("login-error").textContent = "Không đọc được mã QR trong ảnh này."; showStatus(); }
}
async function qrStart() {
  $("login-error").textContent = "";
  let detect;
  try {
    // camera first, while the tap still counts as a user gesture (Safari), then the decoder
    qrScan.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    detect = await qrDecoder();
  } catch (e) {
    qrStop();
    $("login-error").textContent = e.name === "NotFoundError" || e.name === "OverconstrainedError" ? "Máy này không có camera — dùng “Tải ảnh mã QR” hoặc một cách ghép khác."
      : e.name === "NotAllowedError" ? "Trình duyệt chưa được phép dùng camera — cho phép trong cài đặt trang, hoặc dùng “Tải ảnh mã QR”."
      : "Không mở được camera: " + (e.message || e.name);
    showStatus(); return;
  }
  const v = $("qr-video"); v.srcObject = qrScan.stream;
  $("qr-scan").classList.add("hidden"); $("qr-box").classList.remove("hidden");
  await v.play().catch(() => {});
  $("qr-box").scrollIntoView({ behavior: "smooth", block: "center" });
  const tick = async () => {
    if (!qrScan.stream) return;
    let text = "";
    try { text = await detect(v); } catch {}
    if (text) {
      if (parseQR(text)) { qrStop(); qrFound(text); return; }
      $("login-error").textContent = "Mã QR này không phải của RemoteCC.";
    }
    qrScan.timer = setTimeout(tick, 150);
  };
  tick();
}
if (navigator.mediaDevices?.getUserMedia) { $("qr-scan").onclick = qrStart; $("qr-cancel").onclick = qrStop; }
else $("qr-scan").classList.add("hidden");   // no camera API: the upload button still works
$("qr-upload").onclick = () => $("qr-file").click();
$("qr-file").onchange = () => { const f = $("qr-file").files[0]; $("qr-file").value = ""; if (f) qrUploaded(f); };
$("pair-link").onkeydown = (e) => { if (e.key === "Enter") pairNow(); };
$("signout").onclick = async () => {
  if (confirm(`Quên ${tunnel.macName}? Trình duyệt này sẽ mất quyền; muốn dùng lại phải ghép lại từ Mac.`)) await tunnel.forget();
};
tunnel.addEventListener("unpaired", () => { resetView(); showPairing("Đã ngắt khỏi Mac (hết hạn ghép, hoặc Mac đã gỡ trình duyệt này). Ghép lại bên dưới."); });
tunnel.addEventListener("presence", () => { renderOffline(); if (tunnel.macOnline) loadTerminalList(true); });

function renderOffline() {
  let bar = $("offline");
  if (!bar) { bar = el("div", "offline-bar hidden"); bar.id = "offline"; document.querySelector(".main").prepend(bar); }
  bar.textContent = `${tunnel.macName} đang offline — bật Mac và RemoteCC trên Mac để tiếp tục. Tin không được gửi khi Mac tắt.`;
  bar.classList.toggle("hidden", tunnel.macOnline || !tunnel.paired);
}

// ---- PIN lock (tunnel.js): set when pairing or from 🔒; idle longer than its hours → this screen until the PIN is typed.
function showLock(msg = "") {
  $("app").classList.add("hidden"); $("login").classList.add("hidden"); $("lock").classList.remove("hidden");
  $("lock-title").textContent = `${tunnel.lockedName} đã khoá`;
  $("lock-error").textContent = msg; $("pin-in").value = ""; setTimeout(() => $("pin-in").focus(), 50);
}
$("lock-form").onsubmit = async (e) => {
  e.preventDefault();
  const pin = $("pin-in").value.trim();
  if (!pin) return;
  try { await tunnel.unlock(pin); $("lock").classList.add("hidden"); start(); }
  catch (err) {
    $("pin-in").value = ""; $("lock-error").textContent = err.message;
    if (!tunnel.lockedName || /quên Mac/.test(err.message)) { $("lock").classList.add("hidden"); showPairing(err.message); }
  }
};
// pairing page: copy the install prompt / command
for (const b of document.querySelectorAll("[data-copy]")) b.onclick = async () => {
  try { await navigator.clipboard.writeText($(b.dataset.copy).textContent.trim()); b.textContent = "Đã chép"; setTimeout(() => b.textContent = "Chép", 1500); } catch {}
};
$("lock-forget").onclick = async () => {
  if (!confirm("Bỏ Mac này khỏi trình duyệt? Muốn dùng lại phải ghép lại.")) return;
  await tunnel.wipe(); $("lock").classList.add("hidden"); showPairing();
};
async function pinAfterPair() {   // the PIN typed on the pairing page, if any
  const pin = $("pin-new").value.trim();
  if (!pin) return;
  if (!/^\d{4,6}$/.test(pin)) { alert("Mã khoá gồm 4–6 chữ số — chưa đặt mã. Đặt lại bằng nút 🔒."); $("pin-new").value = ""; return; }
  try { await tunnel.setPin(pin, Number($("pin-hours").value)); } catch (e) { alert("Chưa đặt được mã khoá: " + e.message); }
  $("pin-new").value = "";
}
// PIN fields take digits only (typed or pasted)
for (const id of ["pin-new", "pin-in", "pin-set"]) $(id).addEventListener("input", (e) => {
  const v = e.target.value.replace(/\D/g, "").slice(0, 6); if (v !== e.target.value) e.target.value = v;
});
$("pin-btn").onclick = () => {
  const on = tunnel.pinSet;
  $("pin-on").classList.toggle("hidden", !on);
  $("pin-label").textContent = on ? "Đổi mã khoá (4–6 số)" : "Mã khoá mới (4–6 số)";
  $("pin-set").value = ""; $("pin-error").textContent = "";
  $("pin-sheet").showModal(); $("pin-set").focus();
};
$("pin-cancel").onclick = () => $("pin-sheet").close();
$("pin-lock-now").onclick = async () => { await tunnel.lockNow(); location.reload(); };
$("pin-off").onclick = async () => {
  try { await tunnel.setPin(""); $("pin-sheet").close(); alert("Đã bỏ mã khoá."); } catch (e) { $("pin-error").textContent = e.message; }
};
$("pin-form").onsubmit = async (e) => {
  e.preventDefault();
  const pin = $("pin-set").value;
  if (!/^\d{4,6}$/.test(pin)) { $("pin-error").textContent = "Mã khoá gồm 4–6 chữ số"; return; }
  try { await tunnel.setPin(pin, Number($("pin-set-hours").value)); $("pin-sheet").close(); alert("Đã đặt mã khoá."); }
  catch (err) { $("pin-error").textContent = err.message; }
};
// activity keeps the unlock alive; coming back after the idle time locks the page
for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => { if (tunnel.pinSet) tunnel.touch(); }, { passive: true });
const lockCheck = async () => { if (!document.hidden && tunnel.pinSet && !(await tunnel.unlockValid())) location.reload(); };
document.addEventListener("visibilitychange", lockCheck);
setInterval(lockCheck, 60_000);

function start() {
  window.rccPath?.("/app"); window.rccBeacon?.("app");   // aggregate count only (beacon.js)
  S.unsub.forEach((u) => u()); S.unsub = [];
  $("login").classList.add("hidden");
  $("app").classList.remove("hidden");
  S.uid = "local";
  $("who").textContent = tunnel.macName;
  tunnel.connect();
  // `clo/<uid>/…` = document paths of the bridge store (wire id — the bridge and the iOS app share them)
  const base = `clo/${S.uid}`;
  S.unsub.push(onSnapshot(collection(db, `${base}/bridge`), (snap) => {
    S.bridges = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderTitle(); renderSidebar();
  }));
  S.unsub.push(onSnapshot(collection(db, `${base}/terminalSeen`), (snap) => {
    S.seen = Object.fromEntries(snap.docs.map((d) => [d.id, tsDate(d.data().seenAt)])); renderSidebar();
  }));
  S.unsub.push(onSnapshot(collection(db, `${base}/environments`), (snap) => {
    S.envs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }));
  S.unsub.push(onSnapshot(collection(db, `${base}/secrets`), (snap) => {
    S.secrets = new Map(snap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
    if (S.view.kind === "secrets" || S.view.kind === "terminal") renderMessages();
  }));
  S.unsub.push(onSnapshot(collection(db, `${base}/terminalPins`), (snap) => {
    S.termPins = new Set(snap.docs.map((d) => d.id)); renderSidebar();
  }));
  loadTerminalList(true);
  const t = setInterval(loadTerminalList, 15000);
  S.unsub.push(() => clearInterval(t));
  renderOffline();
  openNew();
}

async function boot() {
  if (!globalThis.crypto?.subtle || typeof CompressionStream === "undefined") {
    return showPairing("Trình duyệt này thiếu mã hoá cần thiết — dùng Chrome, Edge hoặc Safari bản mới.");
  }
  // #pair=… from the Mac's page: the fragment never reaches any server. Drop it from the address bar right away.
  // #pair=… (the Mac's "open the web app here") or ?d=… (its QR opened by the iPhone Camera app)
  const qd = new URLSearchParams(location.search).get("d");
  const fromHash = location.hash.startsWith("#pair=") ? location.hash : qd ? "#pair=" + qd : "";
  if (fromHash) history.replaceState(null, "", location.pathname);
  let have = false;
  try { have = await tunnel.load(); }
  catch { return showPairing("Không đọc được bộ nhớ trình duyệt (tab riêng tư?) — ghép lại, hoặc mở trong tab thường."); }
  if (have === "locked" && !fromHash) return showLock();
  if (have && !fromHash) return start();
  showPairing();
  if (fromHash) { $("pair-link").value = fromHash; pairNow(); return; }
  // Opened on a Mac that runs RemoteCC: its local page hands out a link it approves at once — no QR, no code.
  const local = await localPairLink();
  if (local && !tunnel.paired) { $("login-error").textContent = `Đang kết nối ${local.name} trên máy này…`; $("pair-link").value = local.link; pairNow({ local: true }); }
  else if (/Macintosh/.test(navigator.userAgent) && !navigator.maxTouchPoints) {
    // Safari blocks https → http://127.0.0.1 fetches: a real navigation to the Mac's page isn't blocked; it sends us back with #pair=…
    $("local-connect-link").href = "http://127.0.0.1:7790/web?to=" + encodeURIComponent(location.origin);
    $("local-connect").classList.remove("hidden");
  }
  const ua = navigator.userAgent, safari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua);
  if (!local && !safari && !/iPhone|iPad|Android/.test(ua)) waitForInstall();   // desktop Chrome / Edge / Firefox
}

// First run: the user is installing RemoteCC on this very computer (pasted the prompt into Claude Code / ran the curl
// line) — keep asking the local bridge for a pairing link and pair the moment it's up. Browsers that can reach
// localhost from https only (not Safari); stops after 20 min, while the tab is hidden, or once paired.
function waitForInstall() {
  const t0 = Date.now();
  $("install-wait").classList.remove("hidden");
  const tick = async () => {
    if (tunnel.paired || $("login").classList.contains("hidden") || Date.now() - t0 > 20 * 60_000) { $("install-wait").classList.add("hidden"); return; }
    const local = document.hidden ? null : await localPairLink();
    if (local && !tunnel.paired) {
      $("install-wait").classList.add("hidden");
      $("login-error").textContent = `Đang kết nối ${local.name} trên máy này…`; $("pair-link").value = local.link; pairNow({ local: true });
      return;
    }
    setTimeout(tick, 4000);
  };
  setTimeout(tick, 4000);
}

async function localPairLink() {
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 1500);
    const r = await fetch("http://127.0.0.1:7790/api/localpair", { signal: ctl.signal, targetAddressSpace: "loopback" });
    return r.ok ? await r.json() : null;
  } catch { return null; }   // no bridge here, or the browser blocks https → localhost (then: the Mac's page button)
}

// Claude Code turns go straight into the Mac's store (only paired devices reach it — no signing backend).
async function queueInbox(rid, d) {
  await setDoc(doc(db, `clo/${S.uid}/terminalInbox/${rid}`), { ...d, status: "pending", editedAt: Timestamp.now() });
}

// ---------------------------------------------------------------- Claude Code session list (REST + field mask: transcripts are big)
// Firestore bills every document read: a full list (~130 docs) only every 5 min, otherwise just sessions written since the
// last look (bridge stamps `syncedAt` on every write); nothing while the tab is hidden.
// Background agents/commands the session's claude still runs after it answered (bridge field bgTasks).
const bgLabel = (t) => `⏳ ${t.length} việc chạy ngầm: ${t.join(" · ")}`;
const LIST_FIELDS = ["title", "cwd", "project", "machine", "machineLabel", "editedAt", "state", "activity", "activityAt", "contextTokens", "needsInput", "parentId", "syncedAt", "agent", "model", "bgTasks"];
const listState = { full: 0, since: null };
async function loadTerminalList(force = false) {
  if (!S.uid || !tunnel.macOnline || (document.hidden && !force)) return;
  const toSession = (d) => {
    const f = decodeFields(d.fields || {});
    return { id: d.name.split("/").pop(), ...f, editedAt: f.editedAt ? new Date(f.editedAt) : new Date(0),
             working: f.state === "working" && f.activityAt && Date.now() - new Date(f.activityAt) < 120000 };
  };
  try {
    const started = new Date(Date.now() - 5000).toISOString();  // overlap: writes in flight while we query
    if (force || !listState.since || Date.now() - listState.full > 300000) {
      const r = await tunnel.request("GET", `clo/${S.uid}/terminalSessions?pageSize=300&${LIST_FIELDS.map((f) => `mask.fieldPaths=${f}`).join("&")}`);
      S.terminal = (r.body.documents || []).map(toSession);
      listState.full = Date.now();
    } else {
      const r = await tunnel.request("POST", `clo/${S.uid}:runQuery`, { structuredQuery: {
        select: { fields: LIST_FIELDS.map((fieldPath) => ({ fieldPath })) }, from: [{ collectionId: "terminalSessions" }],
        where: { fieldFilter: { field: { fieldPath: "syncedAt" }, op: "GREATER_THAN", value: { timestampValue: listState.since } } } } });
      const rows = r.body;
      if (!Array.isArray(rows)) throw new Error("query");
      const changed = rows.filter((x) => x.document).map((x) => toSession(x.document));
      listState.since = started;
      if (!changed.length) {  // "working" still expires on its own clock
        for (const s of S.terminal) s.working = s.state === "working" && s.activityAt && Date.now() - new Date(s.activityAt) < 120000;
        return renderSidebar();
      }
      const byId = new Map(S.terminal.map((s) => [s.id, s]));
      for (const s of changed) byId.set(s.id, s);
      S.terminal = [...byId.values()];
    }
    listState.since = started;
    renderSidebar();
  } catch { /* offline: keep last list */ }
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) loadTerminalList(); });

function decodeFields(fields) {
  const v = (x) => {
    const [k, val] = Object.entries(x)[0];
    if (k === "integerValue") return Number(val);
    if (k === "arrayValue") return (val.values || []).map(v);
    if (k === "mapValue") return decodeFields(val.fields || {});
    return val;
  };
  return Object.fromEntries(Object.entries(fields).map(([k, x]) => [k, v(x)]));
}

// /btw threads live in a floating chat head (like Messenger's on Android): drag it anywhere — it sticks to the nearest
// side; tap it to open / close the thread; drag it onto the × at the bottom (or "Ẩn") to hide it — the "btw" orb beside
// the vibecoding hand in the composer shows / hides it. Each thread: the side questions and answers, "Hỏi tiếp…" asks a follow-up (another side
// branch carrying the thread so far).
// The "btw" orb beside the vibecoding hand: shows / hides the chat head; with no thread yet it starts a /btw question.
function btwSetHidden(h) {
  BTW.hidden = h; if (h) BTW.open = false;
  try { localStorage.setItem("rcc.btwHidden", h ? "1" : ""); } catch {}
}
$("btw-toggle").onclick = () => { btwSetHidden(!BTW.hidden); renderMessages(); };
function btwThreads() {
  const by = new Map();
  for (const r of [...S.branchRuns].filter((x) => x.btw).sort((a, b) => a.at - b.at)) {
    const k = r.thread || r.id; if (!by.has(k)) by.set(k, []); by.get(k).push(r);
  }
  return [...by.values()];
}
// btw runs are inbox docs (fork + btw fields), so coming back to a session — or opening it on another device — brings its
// side threads back; "Xoá" is written to the thread's first doc (btwHidden), "seen" stays in this browser.
const btwSeen = new Set(JSON.parse(localStorage.getItem("rcc.btwSeen") || "[]"));
function btwMarkSeen(r) {
  if (r.seen && btwSeen.has(r.id)) return;
  r.seen = true; btwSeen.add(r.id);
  try { localStorage.setItem("rcc.btwSeen", JSON.stringify([...btwSeen].slice(-300))); } catch {}
}
function btwDismiss(first) {
  first.dismissed = true; renderMessages();
  updateDoc(doc(db, `clo/${S.uid}/terminalInbox/${first.id}`), { btwHidden: true }).catch(() => {});
}
function btwRestore(docs) {
  for (const d of docs) {
    if (!d.fork || !d.btw || !d.btwQ) continue;
    const run = S.branchRuns.find((r) => r.id === d.id);
    if (run) { Object.assign(run, d, { command: run.command, at: run.at }); if (d.btwHidden) run.dismissed = true; continue; }
    S.branchRuns.push({ ...d, command: d.btwQ, thread: d.thread || d.id, at: tsDate(d.createdAt) || Date.now(),
      dismissed: !!d.btwHidden, seen: btwSeen.has(d.id) });
  }
}
const BTW = { open: false, hidden: localStorage.getItem("rcc.btwHidden") === "1", cur: null, drag: null,
  pos: (() => { try { return JSON.parse(localStorage.getItem("rcc.btwPos")) || null; } catch { return null; } })() };
function btwPlace(head) {
  const w = innerWidth, h = innerHeight, size = 56, m = 10;
  const p = BTW.pos || { side: "right", y: h - 200 };
  const y = Math.max(m + 50, Math.min(h - size - m - 80, p.y));
  head.style.left = (p.side === "left" ? m : w - size - m) + "px"; head.style.top = y + "px";
  return { side: p.side, y };
}
function btwChrome() {
  let head = $("btw-head"), panel = $("btw-panel"), trash = $("btw-trash");
  if (head) return { head, panel, trash };
  head = el("button", "btw-chathead"); head.id = "btw-head"; head.type = "button"; head.title = "Hỏi bên lề (/btw) — kéo để di chuyển, bấm để mở";
  panel = el("div", "btw-panel hidden"); panel.id = "btw-panel";
  trash = el("div", "btw-trash hidden", "×"); trash.id = "btw-trash";
  document.body.append(panel, trash, head);
  head.addEventListener("pointerdown", (e) => {
    if (e.button) return;
    head.setPointerCapture(e.pointerId);
    const r = head.getBoundingClientRect();
    BTW.drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false };
  });
  head.addEventListener("pointermove", (e) => {
    const d = BTW.drag; if (!d || d.id !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) return;
    if (!d.moved) { d.moved = true; head.classList.add("dragging"); trash.classList.remove("hidden"); panel.classList.add("hidden"); }
    head.style.left = e.clientX - d.dx + "px"; head.style.top = e.clientY - d.dy + "px";
    const t = trash.getBoundingClientRect();
    trash.classList.toggle("hot", Math.hypot(e.clientX - (t.left + t.width / 2), e.clientY - (t.top + t.height / 2)) < 60);
  });
  const end = (e) => {
    const d = BTW.drag; if (!d || d.id !== e.pointerId) return;
    BTW.drag = null; head.classList.remove("dragging");
    const hot = trash.classList.contains("hot");
    trash.classList.add("hidden"); trash.classList.remove("hot");
    if (!d.moved) { BTW.open = !BTW.open; BTW.focusNew = BTW.open; return renderMessages(); }
    if (hot) { btwSetHidden(true); return renderMessages(); }
    BTW.pos = { side: e.clientX < innerWidth / 2 ? "left" : "right", y: e.clientY - d.dy };
    try { localStorage.setItem("rcc.btwPos", JSON.stringify(BTW.pos)); } catch {}
    head.classList.add("snap"); btwPlace(head); setTimeout(() => head.classList.remove("snap"), 250);
    if (BTW.open) renderMessages();
  };
  head.addEventListener("pointerup", end); head.addEventListener("pointercancel", end);
  addEventListener("resize", () => { if (!head.classList.contains("hidden")) { btwPlace(head); if (BTW.open) renderMessages(); } });
  // like Messenger: a tap anywhere else folds the thread back into the head
  document.addEventListener("pointerdown", (e) => {
    if (BTW.open && !panel.contains(e.target) && !head.contains(e.target) && !$("btw-toggle").contains(e.target)) { BTW.open = false; renderMessages(); }
  });
  return { head, panel, trash };
}
function renderBtwDock(answerOf) {
  const { head, panel } = btwChrome();
  if (BTW.drag) return;   // mid-drag: don't rebuild under the finger
  const keep = panel.querySelector(".btw-input input:focus");   // a half-typed follow-up survives re-renders
  const typed = keep ? { thread: keep.dataset.thread, value: keep.value } : null;
  const threads = S.view.kind === "terminal" ? btwThreads().filter((t) => !t[0].dismissed) : [];
  // the bubble floats on every Claude Code session from the start (unless hidden); with no thread it opens an empty
  // panel to ask the first side question
  const show = S.view.kind === "terminal" && !BTW.hidden;
  head.classList.toggle("hidden", !show);
  const tg = $("btw-toggle"); tg.classList.toggle("on", !!show); tg.classList.toggle("has", threads.length > 0);
  tg.title = show ? "Ẩn bong bóng btw" : "Hiện bong bóng btw";
  if (!show) { panel.classList.add("hidden"); return; }
  if (BTW.cur !== "new" && !threads.some((t) => t[0].id === BTW.cur)) BTW.cur = threads.length ? threads[threads.length - 1][0].id : "new";
  if (!threads.length) BTW.cur = "new";
  const unseen = threads.reduce((n, t) => n + t.filter((r) => (answerOf(r) || r.error) && !r.seen).length, 0);
  const working = threads.some((t) => { const l = t[t.length - 1]; return !(answerOf(l) || l.error); });
  head.replaceChildren(el("span", "lbl", "btw"));
  if (unseen && !BTW.open) head.append(el("span", "badge", String(unseen)));
  head.classList.toggle("working", working);
  const at = btwPlace(head);
  panel.classList.toggle("hidden", !BTW.open);
  if (!BTW.open) return;
  // the panel opens beside the head, on the screen side it sticks to
  const w = Math.min(420, innerWidth - 20), maxH = Math.min(520, innerHeight - 90);
  panel.style.width = w + "px"; panel.style.maxHeight = maxH + "px";
  panel.style.left = (at.side === "left" ? 10 : innerWidth - w - 10) + "px";
  const below = at.y + 64, above = at.y - 8;
  if (innerHeight - below >= Math.min(maxH, 320)) { panel.style.top = below + "px"; panel.style.bottom = ""; }
  else { panel.style.top = ""; panel.style.bottom = Math.max(10, innerHeight - above) + "px"; }
  panel.replaceChildren();
  const top = el("div", "btw-top");
  if (threads.length > 1) {
    const tabs = el("div", "btw-tabs");
    for (const t of threads) {
      const n = t.filter((r) => (answerOf(r) || r.error) && !r.seen).length;
      const b = el("button", "btw-tab" + (t[0].id === BTW.cur ? " on" : ""), t[0].command);
      if (n && t[0].id !== BTW.cur) b.append(el("span", "badge", String(n)));
      b.onclick = () => { BTW.cur = t[0].id; renderMessages(); };
      tabs.append(b);
    }
    top.append(tabs);
  } else top.append(el("div", "btw-title", "Hỏi bên lề"));
  if (threads.length && BTW.cur !== "new") top.append(ibtn("plus", () => { BTW.cur = "new"; BTW.focusNew = true; renderMessages(); }, "Câu hỏi bên lề mới"));
  top.append(ibtn("x", () => { BTW.open = false; renderMessages(); }, "Thu gọn"));
  panel.append(top);
  if (BTW.cur === "new") {   // a fresh side question: asked like /btw from the composer
    const body = el("div", "btw-body");
    body.append(el("p", "muted small btw-empty", "Hỏi Claude bất cứ lúc nào mà không làm gián đoạn việc chính: câu trả lời dựa trên ngữ cảnh phiên này và hiện ở đây."));
    panel.append(body);
    const row = el("form", "btw-input");
    const inp = el("input"); inp.placeholder = "Hỏi bên lề…"; inp.dataset.thread = "new";
    if (typed?.thread === "new") inp.value = typed.value;
    const go = ibtn("send", () => row.requestSubmit(), "Gửi"); go.type = "button";
    row.append(inp, go);
    if (threads.length) row.append(btn("Huỷ", () => { BTW.cur = null; renderMessages(); }, "link"));
    row.onsubmit = (e) => {
      e.preventDefault();
      const q = inp.value.trim(); if (!q) return;
      inp.value = ""; sendTerminal("/btw " + q, [], []);
    };
    panel.append(row);
    if (typed?.thread === "new" || BTW.focusNew) requestAnimationFrame(() => inp.focus());
    BTW.focusNew = false;
    return;
  }
  const t = threads.find((x) => x[0].id === BTW.cur), first = t[0], last = t[t.length - 1];
  t.forEach((r) => { if (answerOf(r) || r.error) btwMarkSeen(r); });
  const body = el("div", "btw-body");
  const mainRunning = S.inbox.some((x) => x.status === "running");
  for (const r of t) {
    body.append(el("div", "btw-msg q", r.command));
    if (r.error) body.append(el("div", "error small", r.error));
    else if (answerOf(r)) { const a = el("div", "btw-msg a"); a.append(markdown(answerOf(r))); body.append(a); }
    else {
      const a = el("div", "btw-msg a muted small", "Đang trả lời bên lề — việc chính vẫn chạy… ");
      if (mainRunning && r === first && t.length === 1)
        a.append(btn("Đưa vào việc chính", () => { btwDismiss(first); sendTerminal(r.command, [], [], true); }, "link"));
      body.append(a);
    }
  }
  panel.append(body);
  const row = el("form", "btw-input");
  const inp = el("input"); inp.placeholder = "Hỏi tiếp…"; inp.dataset.thread = first.id;
  if (typed?.thread === first.id) inp.value = typed.value;
  const busy = !(answerOf(last) || last.error);
  const go = ibtn("send", () => row.requestSubmit(), "Gửi"); go.type = "button"; go.disabled = busy;
  const drop = btn("Xoá", () => btwDismiss(first), "link");
  drop.title = "Xoá cuộc hỏi bên lề này";
  row.append(inp, go, drop);
  row.onsubmit = (e) => {
    e.preventDefault();
    const q = inp.value.trim(); if (!q || busy) return;
    inp.value = ""; sendBtw(q, t, answerOf);
  };
  panel.append(row);
  requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; if (typed?.thread === first.id) inp.focus(); });
}

// A follow-up in a /btw thread: one more side branch on a copy of the session, with the thread so far in the prompt.
async function sendBtw(q, thread, answerOf) {
  const s = S.session, v = S.view;
  if (!s || v.kind !== "terminal") return;
  const past = thread.map((r) => `Q: ${r.command}\nA: ${answerOf(r) || "(no answer yet)"}`).join("\n\n");
  const rid = uuid(), ref = doc(db, `clo/${S.uid}/terminalInbox/${rid}`);
  const run = { id: rid, command: q, btw: true, thread: thread[0].id, status: "pending", reply: "", error: "", at: Date.now(), seen: true };
  S.branchRuns.unshift(run);
  try {
    await queueInbox(rid, {
      text: `An ongoing side question (/btw) while this session works on its main task. So far:\n\n${past}\n\nFollow-up: ${q}\n\n`
        + "Answer briefly from the session context and the exchange above, in the language the question is written in. Don't edit files, don't run commands that change anything, don't continue the main task.",
      sessionId: v.id, cwd: s.cwd, machine: s.machine, profile: $("profile").value, browser: true, fork: true,
      btw: true, btwQ: q, thread: thread[0].id,
      effort: $("effort").value, model: $("tmodel").value, images: [], createdAt: now() });
  } catch (e) { run.error = "Không gửi được: " + e.message; }
  S.viewUnsub.push(onSnapshot(ref, (d) => { Object.assign(run, d.data() || {}, { command: run.command }); renderMessages(); }));
  renderMessages();
}

// ---------------------------------------------------------------- sidebar
function renderSidebar() {
  if (guarded("side-list", renderSidebar)) return;
  const list = $("side-list");
  list.replaceChildren();
  const chats = [...S.convos.values()].map((c) => ({ kind: "chat", id: c.id, title: c.title, date: tsDate(c.updatedAt),
    sub: `${c.modelRaw?.includes("sonnet") ? "Sonnet" : "Opus"} · ${rel(tsDate(c.updatedAt))}`, pinned: !!c.pinned }));
  const terms = S.terminal.map((s) => ({ kind: "terminal", id: s.id, title: s.title, date: s.editedAt, working: s.working, asks: asksYou(s),
    bg: s.working ? [] : (s.bgTasks || []), activity: s.activity, sub: `${s.agent === "codex" ? "Codex" : s.agent === "agy" ? "agy" : "Claude Code"} · ${s.machineLabel || s.machine} · ${rel(s.editedAt)}${s.contextTokens ? ` · ${Math.round(s.contextTokens / 1000)}k` : ""}`, pinned: S.termPins.has(s.id) }));
  const q = ($("side-search").value || "").trim().toLowerCase();
  const all = [...chats, ...terms].sort((a, b) => b.date - a.date)
    .filter((x) => !q || [x.title, x.sub, x.activity].some((t) => (t || "").toLowerCase().includes(q)));
  if (q && !all.length) list.append(el("p", "muted small", "Không thấy gì khớp."));
  const section = (label, items, cls = "", collapsed = false, toggle = null) => {
    if (!items.length) return;
    const h = el("div", "side-section " + cls, label);
    if (toggle) { h.classList.add("toggle"); h.classList.toggle("open", !collapsed); h.onclick = toggle; }
    list.append(h);
    if (collapsed) return;
    for (const it of items) {
      const row = el("div", "item" + (S.view.kind === it.kind && S.view.id === it.id ? " active" : ""));
      const ico = el("span", "ico"); ico.append(svg(it.kind === "terminal" ? "terminal" : "chat", 14)); row.append(ico);
      const body = el("div", "body");
      body.append(el("div", "t", it.title || "Cuộc trò chuyện"));
      if (it.working) body.append(el("div", "activity", it.activity || "Đang làm việc…"));
      else if (it.bg?.length) body.append(el("div", "activity", bgLabel(it.bg)));
      body.append(el("div", "sub", it.sub));
      row.append(body);
      if (it.asks) row.append(Object.assign(el("span", "dot"), { title: "Cần bạn trả lời" }));
      const pin = ibtn("pin", () => togglePin(it.kind, it.id), it.pinned ? "Bỏ ghim" : "Ghim", "row-pin" + (it.pinned ? " on" : ""));
      pin.addEventListener("click", (e) => e.stopPropagation());
      row.append(pin);
      row.onclick = () => { it.kind === "chat" ? openChat(it.id) : openTerminal(it.id); $("sidebar").classList.remove("open"); };
      row.oncontextmenu = (e) => { e.preventDefault(); rowMenu(e, it); };
      list.append(row);
    }
  };
  // Like the app (and Claude Code desktop): what needs you, what's running, pinned, then the rest.
  section("Đã ghim", all.filter((x) => x.pinned));
  const unpinned = all.filter((x) => !x.pinned);
  // Collapsed until opened (still expanded while searching, so hits aren't hidden).
  section(`Cần bạn trả lời (${unpinned.filter((x) => x.asks).length})`, unpinned.filter((x) => x.asks), "ask",
          !S.asksOpen && !q, () => { S.asksOpen = !S.asksOpen; renderSidebar(); });
  section("Đang chạy", unpinned.filter((x) => (x.working || x.bg?.length) && !x.asks));
  section("Gần đây", unpinned.filter((x) => !x.asks && !x.working && !x.bg?.length));
  procsSection(list);
  for (const k of ["artifacts", "skills", "saved", "secrets"]) $("go-" + k).classList.toggle("active", S.view.kind === k);
}

// Every live `claude` on each Mac (bridge heartbeat): RemoteCC turns, Terminal sessions, background agents — stop one.
function procsSection(list) {
  const rows = S.bridges.filter((b) => Date.now() - tsDate(b.lastSeen) < 90000)
    .flatMap((b) => (b.procs || []).filter((p) => !S.procStopped?.has(`${p.pid}-${p.started}`)).map((p) => ({ b, p })))
    .sort((x, y) => y.p.lastActive - x.p.lastActive);
  if (!S.bridges.some((b) => (b.features || []).includes("procs"))) return;
  const h = el("div", "side-section toggle", `Tiến trình Claude (${rows.length})`);
  h.classList.toggle("open", !!S.procsOpen);
  h.onclick = () => { S.procsOpen = !S.procsOpen; renderSidebar(); };
  list.append(h);
  if (!S.procsOpen) return;
  if (!rows.length) list.append(el("p", "muted small", "Không có phiên claude nào đang chạy."));
  const src = { clo: "RemoteCC", terminal: "Terminal", background: "Chạy nền" };
  for (const { b, p } of rows) {
    const s = S.terminal.find((t) => t.id === p.sid);
    const row = el("div", "item proc" + (S.view.kind === "terminal" && S.view.id === p.sid ? " active" : ""));
    const ico = el("span", "ico"); ico.append(svg("terminal", 14)); row.append(ico);
    const body = el("div", "body");
    body.append(el("div", "t", s?.title || (p.cwd || "").split("/").pop() || `pid ${p.pid}`));
    body.append(el("div", "sub", [src[p.source] || p.source, b.label || b.machine, (p.cwd || "").split("/").pop(), p.cpu >= 5 ? `${Math.round(p.cpu)}% CPU` : ""].filter(Boolean).join(" · ")));
    body.append(el("div", "sub", `chạy từ ${rel(new Date(p.started * 1000))} · hoạt động ${rel(new Date(p.lastActive * 1000))}`));
    row.append(body);
    const stop = ibtn("stop", () => stopProc(b, p, stop), `Dừng (pid ${p.pid})`, "row-stop");
    stop.addEventListener("click", (e) => e.stopPropagation());
    row.append(stop);
    if (s) row.onclick = () => { openTerminal(s.id); $("sidebar").classList.remove("open"); };
    list.append(row);
  }
}

async function stopProc(b, p, button) {
  const what = p.source === "terminal" ? "Phiên mở trong Terminal sẽ bị tắt; phần đang làm dở có thể mất." : "Lượt đang chạy sẽ bị ngắt.";
  if (!confirm(`Dừng claude (pid ${p.pid}) trên ${b.label || b.machine}?\n${what}`)) return;
  button.disabled = true;
  try {
    await queueInbox(uuid(), { kind: "killProc", machine: b.machine, text: JSON.stringify({ pid: p.pid, started: p.started }) });
    (S.procStopped ||= new Set()).add(`${p.pid}-${p.started}`);  // hidden until the next heartbeat drops it
    renderSidebar();
  } catch (e) { alert("Không dừng được: " + e.message); button.disabled = false; }
}

// Asked you something since you last opened it (any device), within a week, and isn't running again.
function asksYou(s) {
  return !!s.needsInput && !s.working && s.editedAt > (S.seen[s.id] || 0) && Date.now() - s.editedAt < 7 * 86400000;
}
function markSeen(id) { if (id) setDoc(doc(db, `clo/${S.uid}/terminalSeen/${id}`), { seenAt: now() }).catch(() => {}); }

$("side-search").oninput = renderSidebar;

$("menu").onclick = () => {
  if (matchMedia("(max-width: 760px)").matches) $("sidebar").classList.toggle("open");
  else { $("app").classList.remove("collapsed"); localStorage.setItem("clo.sideCollapsed", ""); }
};
// Phone: the drawer covers the menu button — a tap on the chat beside it closes it.
document.querySelector(".main")?.addEventListener("pointerdown", (e) => { if (!$("menu").contains(e.target)) $("sidebar").classList.remove("open"); });
$("collapse").onclick = () => { $("app").classList.add("collapsed"); localStorage.setItem("clo.sideCollapsed", "1"); };
if (localStorage.getItem("clo.sideCollapsed")) $("app").classList.add("collapsed");
for (const kind of ["artifacts", "skills", "saved", "secrets"]) $("go-" + kind).onclick = () => { openLibrary(kind); $("sidebar").classList.remove("open"); };

// ---------------------------------------------------------------- views
function resetView() {
  S.viewUnsub.forEach((u) => u()); S.viewUnsub = [];
  if (!$("findbar").classList.contains("hidden")) closeFind();
  S.running = null; S.messages = []; S.inbox = []; S.session = null; S.pending = []; S.files = []; S.newReqs = []; S.branchRuns = [];
  renderThumbs(); renderFiles(); hideSlash();
  stopAudio();
}

function openNew() {   // RemoteCC home: no direct chat (that needed a cloud account) — pick or start a Claude Code session
  resetView();
  S.view = { kind: "new", id: uuid() };
  setComposerMode("library");
  renderAll();
}

function openChat(id) {
  resetView();
  S.view = { kind: "chat", id };
  setComposerMode("chat");
  const c = S.convos.get(id);
  if (c?.modelRaw) $("model").value = c.modelRaw;
  S.viewUnsub.push(onSnapshot(query(collection(db, `clo/${S.uid}/messages`), where("conversationId", "==", id)), (snap) => {
    S.messages = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((m) => !m.deleted)
      .sort((a, b) => tsDate(a.createdAt) - tsDate(b.createdAt));
    loadImages();
    renderMessages();
  }));
  renderAll();
}

function openTerminal(id) {
  if (S.view.kind === "terminal") markSeen(S.view.id);
  resetView();
  markSeen(id);
  S.view = { kind: "terminal", id };
  setComposerMode("terminal");
  const base = `clo/${S.uid}`;
  S.viewUnsub.push(onSnapshot(doc(db, `${base}/terminalSessions/${id}`), (d) => { S.session = d.exists() ? d.data() : null; renderAll(); }));
  S.viewUnsub.push(onSnapshot(query(collection(db, `${base}/terminalInbox`), where("sessionId", "==", id),
      where("createdAt", ">", Timestamp.fromMillis(Date.now() - 6 * 3600_000))), (snap) => {  // older turns are in the transcript; each doc read is billed
    const wasActive = new Set(S.inbox.filter((r) => ACTIVE.includes(r.status)).map((r) => r.id));
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    btwRestore(all);
    S.inbox = all.filter((r) => !r.fork && !r.kind && r.text)
      .sort((a, b) => tsDate(a.createdAt) - tsDate(b.createdAt));
    mergeLocalReqs();
    renderMessages();
    syncProfiles();   // other agents are offered only while no turn runs
    // A turn we watched finish → vibecoding reads its summary.
    for (const r of S.inbox) if (wasActive.has(r.id) && r.status === "done" && r.reply) vibe.onReply(r.reply);
    vibe.render();
  }));
  renderAll();
}

function openTerminalNew(machine, cwd, label, env = null) {
  resetView();
  S.view = { kind: "terminal-new", id: null, machine, cwd, label, env };
  if (env) { $("profile").value = env.profile || $("profile").value; $("effort").value = env.effort || ""; }
  setComposerMode("terminal");
  renderAll();
}

$("new-term").onclick = () => {
  const list = $("picker-list"); list.replaceChildren();
  const online = S.bridges.filter((b) => Date.now() - tsDate(b.lastSeen) < 90000);
  if (!online.length) list.append(el("p", "muted", "Chưa có Mac nào đang kết nối (cần RemoteCC bridge chạy trên Mac)."));
  const envs = S.envs.filter((e) => online.some((b) => b.machine === e.machine));
  if (envs.length) list.append(el("div", "pick-machine", "Môi trường"));
  for (const e of envs) {
    const b = el("button", "pick-env", e.name || e.cwd.split("/").pop());
    b.append(el("small", null, [e.label, e.cwd.split("/").pop(), ...(e.addDirs || []).map((d) => "+ " + d.split("/").pop()), e.worktree ? "worktree" : ""].filter(Boolean).join(" · ")));
    b.onclick = () => { $("picker").close(); $("sidebar").classList.remove("open"); openTerminalNew(e.machine, e.cwd, e.label || e.machine, e); };
    list.append(b);
  }
  for (const b of online) {
    list.append(el("div", "pick-machine", b.label || b.machine));
    const dirs = [...new Set([...(b.cwds || []), b.home].filter(Boolean))];
    for (const cwd of dirs) {
      const d = el("button", "pick-dir", cwd === b.home ? "~ (thư mục nhà)" : cwd.split("/").pop());
      d.title = cwd;
      d.onclick = () => { $("picker").close(); $("sidebar").classList.remove("open"); openTerminalNew(b.machine, cwd, b.label || b.machine); };
      list.append(d);
    }
    // Same as the app's "Thư mục khác…": every git project the bridge found, or any path typed in.
    const go = (cwd) => { $("picker").close(); $("sidebar").classList.remove("open"); openTerminalNew(b.machine, cwd, b.label || b.machine); };
    const others = (b.projects || []).filter((p) => !dirs.includes(p));
    const row = el("div", "pick-other");
    if (others.length) {
      const sel = el("select"); sel.append(Object.assign(el("option", null, `Tất cả dự án (${others.length})…`), { value: "" }));
      for (const p of others) sel.append(Object.assign(el("option", null, b.home && p.startsWith(b.home) ? "~" + p.slice(b.home.length) : p), { value: p }));
      sel.onchange = () => sel.value && go(sel.value);
      row.append(sel);
    }
    const path = el("input"); path.placeholder = "Nhập đường dẫn, vd ~/letcode/SuIn"; path.spellcheck = false;
    const open = () => {
      let p = path.value.trim(); if (!p) return;
      if (p.startsWith("~") && b.home) p = b.home + p.slice(1);
      if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
      go(p);
    };
    path.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); open(); } };
    row.append(path, btn("Mở", open, "link"));
    if ((b.features || []).includes("github")) row.append(btn("Repo GitHub…", () => openGithub(b, go), "link"));
    list.append(row);
  }
  $("picker").showModal();
};

// GitHub repos through the Mac's own `gh` login (no token here): pick one → the Mac clones it if needed → new session.
async function openGithub(b, go) {
  const list = $("picker-list"); list.replaceChildren(el("div", "pick-machine", `GitHub · ${b.label || b.machine}`));
  const box = el("div"); list.append(box);
  const say = (t, cls = "muted") => box.replaceChildren(el("p", cls, t));
  say("Đang tải danh sách repo…");
  let st;
  try { st = await tunnel.op("gh.status", {}, 30_000); } catch (e) { return say(e.message, "error"); }
  if (!st.installed) return say("Mac chưa có GitHub CLI. Cài bằng: brew install gh", "error");
  if (!st.login) return githubLogin(b, go, box, st.pending);
  let r;
  try { r = await tunnel.op("gh.repos", {}, 120_000); } catch (e) { return say(e.message, "error"); }
  box.replaceChildren();
  const q = el("input"); q.placeholder = `Tìm trong ${r.repos.length} repo của ${st.login}…`; q.spellcheck = false;
  q.className = "gh-search";
  const rows = el("div", "gh-list");
  const draw = () => {
    const words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const hits = r.repos.filter((x) => words.every((w) => (x.name + " " + x.description).toLowerCase().includes(w))).slice(0, 80);
    rows.replaceChildren(...hits.map((x) => {
      const it = el("button", "pick-env", x.name.split("/")[1]);
      const where = x.local ? (r.home && x.local.startsWith(r.home) ? "~" + x.local.slice(r.home.length) : x.local) : "chưa có trên Mac — sẽ clone";
      it.append(el("small", null, [x.name.split("/")[0], x.private ? "private" : "", x.description, where].filter(Boolean).join(" · ")));
      it.onclick = async () => {
        if (x.local) return go(x.local);
        it.disabled = true; it.querySelector("small").textContent = "Đang clone về Mac…";
        try { const c = await tunnel.op("gh.clone", { repo: x.name }, 900_000); go(c.path); }
        catch (e) { it.disabled = false; it.querySelector("small").textContent = "Lỗi: " + e.message; }
      };
      return it;
    }));
    if (!hits.length) rows.append(el("p", "muted", "Không thấy repo nào khớp."));
  };
  q.oninput = draw;
  box.append(q, rows); draw(); q.focus();
}

async function githubLogin(b, go, box, pending) {
  let p = pending;
  if (!p) {
    box.replaceChildren(el("p", "muted", "Mac chưa đăng nhập GitHub."), btn("Kết nối GitHub", async () => {
      box.replaceChildren(el("p", "muted", "Đang lấy mã…"));
      try { p = await tunnel.op("gh.login", {}, 60_000); show(); } catch (e) { box.replaceChildren(el("p", "error", e.message)); }
    }, "primary small"));
    return;
  }
  show();
  function show() {
    const a = Object.assign(el("a", "primary small", "Mở github.com/login/device"), { href: p.url, target: "_blank", rel: "noopener" });
    box.replaceChildren(el("p", null, "Nhập mã này trên trang GitHub rồi bấm Authorize:"), el("div", "gh-code", p.code), a,
      el("p", "muted small", "Mac sẽ đăng nhập GitHub CLI (gh) bằng tài khoản anh chọn. Đang chờ…"));
    const t = setInterval(async () => {
      if (!$("picker").open) return clearInterval(t);
      try { const st = await tunnel.op("gh.status", {}, 30_000); if (st.login) { clearInterval(t); openGithub(b, go); } } catch {}
    }, 3000);
  }
}

function setComposerMode(mode) {
  $("composer").classList.toggle("hidden", mode === "library");
  $("model").classList.toggle("hidden", mode === "library");
  if (mode === "library") { for (const id of ["slash-btn", "branches", "profile", "effort", "tmodel", "compact", "compact-now", "spawn", "vibe-btn", "btw-toggle", "run-btn", "run-pop"]) $(id).classList.add("hidden"); return; }
  for (const id of ["slash-btn", "branches", "profile", "effort", "tmodel", "compact", "compact-now", "vibe-btn", "btw-toggle", "run-btn"]) $(id).classList.toggle("hidden", mode !== "terminal");
  if (mode !== "terminal") $("run-pop").classList.add("hidden");
  $("spawn").classList.toggle("hidden", !(mode === "terminal" && S.view.kind === "terminal"));
  $("model").classList.toggle("hidden", mode === "terminal");
  $("input").placeholder = mode === "terminal" ? "Nhắn cho Claude Code…" : "Nhắn cho RemoteCC…";
}

function renderAll() { renderTitle(); renderMessages(); renderSidebar(); }

function renderTitle() {
  const v = S.view;
  let title = "", pinned = false;
  if (v.kind === "chat") { const c = S.convos.get(v.id); title = c?.title || ""; pinned = !!c?.pinned; }
  if (v.kind === "terminal") { title = S.session?.title || (S.session?.agent === "codex" ? "Codex" : S.session?.agent === "agy" ? "agy" : "Claude Code"); pinned = S.termPins.has(v.id); }
  if (v.kind === "terminal-new") title = `Phiên mới · ${v.label}${v.env ? ` · ${v.env.name}` : ""}`;
  if (LIB[v.kind]) title = LIB[v.kind];
  const nb = S.branchRuns.filter((r) => !r.btw).length;
  $("branches").replaceChildren(svg("branch"), nb ? ` ${nb}` : "");
  $("title").textContent = title;
  renderStatus();
  $("pin").classList.toggle("hidden", !["chat", "terminal"].includes(v.kind));
  $("rename").classList.toggle("hidden", !["chat", "terminal"].includes(v.kind));
  $("find-btn").classList.toggle("hidden", !["chat", "terminal"].includes(v.kind));
  $("pin").classList.toggle("on", pinned);
}

// Rename: chats edit their own doc; Claude Code sessions ask the Mac to write Claude Code's custom-title (so the
// terminal's --resume picker shows it too) — a signed request like any other.
async function rename(kind, id, current) {
  if (!["chat", "terminal"].includes(kind)) return;
  const name = (prompt("Tên mới:", current) || "").trim();
  if (!name || name === current) return;
  try {
    if (kind === "chat") return await updateDoc(doc(db, `clo/${S.uid}/conversations/${id}`), { title: name, editedAt: now() });
    const s = (S.view.id === id && S.session) || S.terminal.find((x) => x.id === id);
    if (!s?.machine) throw new Error("chưa biết phiên này ở Mac nào");
    await queueInbox(uuid(), { kind: "rename", text: name, sessionId: id, machine: s.machine });
    if (S.view.id === id) $("title").textContent = name;
    const row = S.terminal.find((x) => x.id === id); if (row) { row.title = name; renderSidebar(); }
  } catch (e) { alert("Không đổi tên được: " + e.message); }
}
const renameCurrent = () => rename(S.view.kind, S.view.id, $("title").textContent);
$("rename").onclick = renameCurrent;

// Right-click on a sidebar row: small menu of row actions.
function rowMenu(e, it) {
  closeMenu();
  const m = el("div", "ctx"); m.id = "ctx";
  const item = (label, fn) => { const b = el("button", null, label); b.onclick = () => { closeMenu(); fn(); }; m.append(b); };
  item(it.pinned ? "Bỏ ghim" : "Ghim", () => togglePin(it.kind, it.id));
  item("Đổi tên…", () => rename(it.kind, it.id, it.title || ""));
  if (it.kind === "terminal") {
    if (it.asks) item("Đánh dấu đã đọc", () => markSeen(it.id));
    item("Chép ID phiên", () => navigator.clipboard.writeText(it.id));
    item("Chép lệnh resume", () => navigator.clipboard.writeText(`claude --resume ${it.id}`));
  }
  document.body.append(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(e.clientX, innerWidth - r.width - 8) + "px";
  m.style.top = Math.min(e.clientY, innerHeight - r.height - 8) + "px";
}
function closeMenu() { document.getElementById("ctx")?.remove(); }
document.addEventListener("click", closeMenu);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
window.addEventListener("blur", closeMenu);
$("title").ondblclick = renameCurrent;

// Status line under the title (Claude Code views): Mac, plan limits left (Gói Claude profiles), session cost so far.
// Agent/access picker: a new session offers Claude (+ Codex when that Mac has it); an existing session keeps its own
// agent and only the access level follows the picker (the bridge runs a session with the agent that made it).
// Models per agent: the composer's model list follows the session's agent; the pick rides on every message, so a
// session can switch models between turns. agy: a family here + the effort picker → the bridge builds the model id.
const AGENT_MODELS = {
  claude: [["", "Mac default"], ["claude-opus-5-5", "Opus 5.5"], ["claude-sonnet-5-5", "Sonnet 5.5"], ["claude-fable-5-2", "Fable 5.2"], ["claude-haiku-5-5", "Haiku 5.5"]],
  codex: [["", "Mac default"], ["gpt-6-astra", "GPT-6 Astra"], ["gpt-5.6-sol", "GPT-5.6 Sol"], ["gpt-5.6-terra", "GPT-5.6 Terra"], ["gpt-5.6-luna", "GPT-5.6 Luna"]],
  agy: [["neon", "Gemini 4 Neon"], ["carbon", "Gemini 4 Carbon"], ["flash", "Gemini 3.8 Flash"]],
};
const AGENT_LABEL = { claude: "Claude", codex: "Codex", agy: "agy" };
const agentOf = (profile) => profile.startsWith("codex") ? "codex" : profile.startsWith("agy") ? "agy" : "claude";
function fillModels(agent) {
  const m = $("tmodel");
  if (m.dataset.agent === agent) return;
  m.dataset.agent = agent;
  m.replaceChildren(...AGENT_MODELS[agent].map(([v, t]) => Object.assign(document.createElement("option"), { value: v, textContent: t })));
  const want = localStorage.getItem("clo.tmodel." + agent) ?? (agent === "claude" ? localStorage.getItem("clo.tmodel") : null) ?? "";
  m.value = AGENT_MODELS[agent].some(([v]) => v === want) ? want : AGENT_MODELS[agent][0][0];
}

function syncProfiles() {
  const v = S.view, sel = $("profile");
  if (v.kind !== "terminal" && v.kind !== "terminal-new") return;
  const s = v.kind === "terminal" ? (S.session || S.terminal.find((x) => x.id === v.id)) : null;
  const machine = v.kind === "terminal-new" ? v.machine : s?.machine;
  const feats = S.bridges.find((x) => x.machine === machine)?.features || [];
  const agent = s ? (s.agent === "codex" || s.agent === "agy" ? s.agent : "claude") : null;
  // An open session keeps its agent; the others on that Mac stay listed (picking one opens a new session in the folder).
  const busy = agent && S.inbox.some((r) => ["pending", "running", "cancel", "injected"].includes(r.status));
  const ok = (val) => { const a = agentOf(val); return a === agent || (!busy && (a === "claude" || feats.includes(a))); };
  for (const o of sel.options) o.hidden = o.disabled = !ok(o.value);
  const full = sel.value.endsWith("yolo");
  if (agent) sel.value = agent + (full ? "-yolo" : "");
  else {
    const want = v.env?.profile || localStorage.getItem("clo.profile") || "claude-yolo";
    sel.value = ok(want) ? want : "claude" + (full ? "-yolo" : "");
  }
  sel.dataset.prev = sel.value;   // what a refused pick goes back to
  const cur = agentOf(sel.value), other = cur !== "claude";   // Codex and agy have no /compact or child sessions
  fillModels(cur);
  for (const id of ["compact", "compact-now"]) $(id).classList.toggle("hidden", other);
  $("tmodel").classList.remove("hidden");
  if (other) $("spawn").classList.add("hidden");
  if (cur === "agy") $("btw-toggle").classList.add("hidden");   // the bridge refuses btw on agy sessions (one turn per conversation)
}

function renderStatus() {
  syncProfiles();
  const v = S.view, st = $("status"); st.replaceChildren();
  const s = v.kind === "terminal" ? (S.session || S.terminal.find((x) => x.id === v.id)) : null;
  const machine = v.kind === "terminal-new" ? v.machine : s?.machine;
  if (!machine) return;
  const b = S.bridges.find((x) => x.machine === machine);
  const online = b && Date.now() - tsDate(b.lastSeen) < 90000;
  st.append(el("span", "dot " + (online ? "on" : "off")), el("span", null, b?.label || machine));
  // Mac health (bridge heartbeat): memory in use, hottest CPU die, disk used — same thresholds as the app
  const gauge = (title, icon, val, unit, lvl) => {
    const x = el("span"); x.title = title; x.append(el("span", "muted", icon + " "), el("b", lvl, val + unit)); st.append(x);
  };
  if (online && b.ramUsed != null) gauge("RAM đang dùng", "▦", b.ramUsed, "%", b.ramUsed < 75 ? "ok" : b.ramUsed < 90 ? "mid" : "low");
  if (online && b.cpuTemp != null) gauge("Nhiệt CPU", "🌡", b.cpuTemp, "°", b.cpuTemp < 80 ? "ok" : b.cpuTemp < 95 ? "mid" : "low");
  if (online && b.diskUsed != null) gauge(b.diskFree != null ? `SSD — còn ${Math.round(b.diskFree)} GB` : "SSD đã dùng", "⛁", b.diskUsed, "%",
    b.diskUsed < 85 ? "ok" : b.diskUsed < 95 ? "mid" : "low");
  const ag = agentOf($("profile").value), codex = ag === "codex";
  const usage = codex ? b?.codexUsage : ag === "claude" ? b?.usage : null, wins = usage?.windows || [];
  if (ag !== "claude") st.append(el("span", "muted", AGENT_LABEL[ag]));
  if (ag !== "claude" && s?.model) st.append(el("span", "muted", s.model));
  if (ag === "agy") {   // agy reports no plan limits: tokens counted by the bridge, and Google's limit once it's hit
    const au = b?.agyUsage || {}, fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "k" : String(n || 0);
    st.append(el("span", "muted", "Gemini"));
    const x = el("span"); x.title = `Token agy đã dùng: hôm nay ${fmt(au.today)} (${au.turnsToday || 0} lượt) · 7 ngày ${fmt(au.week)}`;
    x.append(el("span", "muted", "hôm nay "), el("b", null, fmt(au.today))); st.append(x);
    if (Number(s?.tokensUsed || 0) > 0) st.append(Object.assign(el("span", "muted", "phiên " + fmt(Number(s.tokensUsed))), { title: "Token cả phiên" }));
    for (const l of au.limits || []) {
      const d = l.until ? new Date(l.until) : null;
      if (d && (isNaN(d) || d <= Date.now())) continue;   // reset already (the Mac's last heartbeat may be old)
      const hm = d ? d.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" }) : "";
      st.append(Object.assign(el("b", "low", `⛔ ${l.model.replace(/^gemini-/, "")} hết hạn mức${hm ? " ↻" + hm : ""}`),
        { title: "Google báo hết hạn mức cho model này — chọn model khác (Carbon / Flash) hoặc chờ" }));
    }
  } else if (!wins.length) st.append(el("span", "muted", codex ? (usage?.plan || "ChatGPT") : "Gói Claude"));   // bridge hasn't reported limits yet
  else {
    if (usage.plan) st.append(el("span", "muted", usage.plan));
    for (const w of wins) {
      const x = el("span"); x.append(el("span", "muted", w.label + " "), el("b", w.left >= 50 ? "ok" : w.left >= 20 ? "mid" : "low", w.left + "%"));
      if (w.resetsAt) {
        const d = new Date(w.resetsAt), today = d.toDateString() === new Date().toDateString();
        const hm = d.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
        x.append(el("span", "muted", ` ↻${hm}${today ? "" : ` ${d.getDate()}/${d.getMonth() + 1}`}`));
      }
      st.append(x);
    }
  }
  if (b?.restarting) st.append(Object.assign(el("span", "mid", "bridge đang cập nhật — tin mới chờ lượt đang chạy xong"), { style: "color:#d98a1c" }));
  renderRunPill(s);
  const cost = Number(s?.totalCost || 0);
  if (cost > 0) st.append(Object.assign(el("span", "muted", "$" + cost.toFixed(cost < 10 ? 2 : 1)), { title: "Chi phí ước tính cả phiên" }));
}

// The composer's one pill: "Opus 5.5 · high · Full │ 367k" — opens the agent / model / effort / compact menu.
function renderRunPill(s = S.view.kind === "terminal" ? S.session : null) {
  const p = $("profile"), m = $("tmodel"), e = $("effort"), ag = agentOf(p.value), codex = ag !== "claude";
  const parts = [m.value ? m.selectedOptions[0]?.text : AGENT_LABEL[ag]];
  if (e.value) parts.push(e.value);
  parts.push(p.value.endsWith("yolo") ? "Full" : "Standard");
  $("run-label").textContent = parts.join(" · ");
  const ctx = Number(s?.contextTokens || 0), cap = Number($("compact").value) || 400000, c = $("run-ctx");
  c.textContent = ctx ? (ctx >= 1e6 ? (ctx / 1e6).toFixed(1) + "M" : Math.round(ctx / 1000) + "k") : "";
  c.className = "run-ctx" + (ctx ? (ctx / cap < 0.6 ? " ok" : ctx / cap < 0.85 ? " mid" : " low") : "");
  c.title = tr("Ngữ cảnh phiên (token) / ngưỡng tự nén") + `: ${Math.round(ctx / 1000)}k / ${Math.round(cap / 1000)}k`;
  c.classList.toggle("hidden", !ctx || codex);
}
$("run-btn").onclick = (ev) => { ev.stopPropagation(); $("run-pop").classList.toggle("hidden"); };
$("run-pop").onclick = (ev) => ev.stopPropagation();
document.addEventListener("click", () => $("run-pop").classList.add("hidden"));
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") $("run-pop").classList.add("hidden"); });

async function togglePin(kind, id) {
  if (kind === "chat") {
    const c = S.convos.get(id);
    await updateDoc(doc(db, `clo/${S.uid}/conversations/${id}`), { pinned: !c?.pinned, editedAt: now() });
  } else if (kind === "terminal") {
    const ref = doc(db, `clo/${S.uid}/terminalPins/${id}`);
    if (S.termPins.has(id)) { const b = writeBatch(db); b.delete(ref); await b.commit(); }
    else await setDoc(ref, { pinnedAt: now() });
  }
}
$("pin").onclick = () => togglePin(S.view.kind, S.view.id);

// ---------------------------------------------------------------- Artifacts / Skills / Đã lưu (same Firestore lists as the app)
const LIB = { artifacts: "Artifacts", skills: "Skills", saved: "Đã lưu", secrets: "Secrets" };

function openLibrary(kind) {
  resetView();
  S.view = { kind, id: null, q: "", open: null };
  S.lib = [];
  setComposerMode("library");
  if (kind === "secrets") return renderAll();  // S.secrets is always subscribed (the chat cards need it too)
  S.viewUnsub.push(onSnapshot(collection(db, `clo/${S.uid}/${kind}`), (snap) => {
    S.lib = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderMessages();
  }));
  renderAll();
}

function renderLibrary(box) {
  const v = S.view, q = (v.q || "").toLowerCase();
  if (v.open) return renderLibraryItem(box, v.open);
  const search = el("input", "lib-search"); search.placeholder = "Tìm…"; search.value = v.q || "";
  search.oninput = () => { v.q = search.value; renderMessages(); const s = $("messages").querySelector(".lib-search"); s.focus(); s.setSelectionRange(s.value.length, s.value.length); };
  box.append(search);
  const hit = (...xs) => !q || xs.some((x) => (x || "").toLowerCase().includes(q));
  if (v.kind === "secrets") return renderSecrets(box, hit);
  if (v.kind === "artifacts") {
    const items = S.lib.filter((a) => hit(a.title, a.source)).sort((a, b) => tsDate(b.updatedAt) - tsDate(a.updatedAt));
    if (!items.length) box.append(el("p", "muted", "Chưa có artifact nào."));
    for (const a of items) {
      const row = el("div", "lib-item"); row.append(el("div", "t", a.title || "Artifact"),
        el("div", "sub", [a.source, rel(tsDate(a.updatedAt)), a.size ? Math.max(1, Math.round(a.size / 1024)) + " KB" : ""].filter(Boolean).join(" · ")));
      row.onclick = () => { v.open = a; renderMessages(); };
      box.append(row);
    }
  } else if (v.kind === "skills") {
    const by = new Map();
    for (const s of S.lib) { if (!by.has(s.name)) by.set(s.name, []); by.get(s.name).push(s); }
    const names = [...by.keys()].filter((n) => hit(n, by.get(n)[0].description)).sort();
    if (!names.length) box.append(el("p", "muted", "Chưa có skill nào."));
    for (const n of names) {
      const copies = by.get(n), row = el("div", "lib-item");
      row.append(el("div", "t", n), el("div", "desc", (copies[0].description || "").slice(0, 220)));
      const tags = el("div"); tags.append(...syncTags(copies)); row.append(tags);
      row.onclick = () => { v.open = { name: n, copies }; renderMessages(); };
      box.append(row);
    }
  } else {
    const items = S.lib.filter((x) => hit(x.title, x.url, x.text, x.note)).sort((a, b) => tsDate(b.createdAt) - tsDate(a.createdAt));
    if (!items.length) box.append(el("p", "muted", "Chưa lưu gì. Lưu từ nút lưu dưới tin trong app."));
    for (const x of items) {
      const row = el("div", "lib-item");
      row.append(el("div", "t", x.title || (x.kind === "link" ? x.url : (x.text || "").slice(0, 120))));
      if (x.kind === "link" && x.title) row.append(el("div", "sub", x.url));
      if (x.note) row.append(el("div", "desc", x.note));
      row.append(el("div", "sub", [x.source, rel(tsDate(x.createdAt))].filter(Boolean).join(" · ")));
      row.onclick = () => { if (x.kind === "link") window.open(x.url, "_blank", "noopener"); else { v.open = x; renderMessages(); } };
      box.append(row);
    }
  }
}

// ---------------------------------------------------------------- Secrets: typed here, sent straight to the Mac (end-to-end encrypted)
function renderSecrets(box, hit) {
  const head = el("div", "secret-head");
  head.append(el("p", "muted small", `Giá trị chỉ nằm trên ${tunnel.macName} (mã hoá, khoá trong Keychain của Mac). Trình duyệt không giữ bản nào; `
    + "máy chủ trung chuyển không đọc được. Claude dùng bằng remotecc-secret. Xem lại giá trị trên iPhone (Face ID)."),
    btn("Thêm secret", () => secretDialog({}), "primary"));
  box.append(head);
  const items = [...S.secrets.values()].filter((x) => hit(x.name, x.label)).sort((a, b) => a.name.localeCompare(b.name));
  if (!items.length) box.append(el("p", "muted", "Chưa có secret nào."));
  for (const x of items) {
    const row = el("div", "lib-item secret-row"), main = el("div", "grow");
    main.append(el("div", "t mono", x.name));
    if (x.label) main.append(el("div", "desc", x.label));
    main.append(el("div", "sub", "Sửa " + rel(tsDate(x.editedAt))));
    row.append(main, ibtn("pencil", () => secretDialog({ name: x.name, label: x.label, kind: x.kind, existing: true }), "Nhập giá trị mới"),
      ibtn("trash", async () => { if (confirm(`Xoá ${x.name} khỏi kho?`)) await tunnel.op("secret.delete", { name: x.name }).catch((e) => alert(e.message)); }, "Xoá"));
    row.onclick = (e) => { if (e.target === row || main.contains(e.target)) secretDialog({ name: x.name, label: x.label, kind: x.kind, existing: true }); };
    box.append(row);
  }
}

async function saveSecret(name, label, kind, value) {
  await tunnel.op("secret.set", { name, label, value });
}

function secretDialog({ name = "", label = "", kind = "", existing = false, onDone }) {
  const d = $("secret-sheet"), f = d.querySelector("form");
  f.reset();
  f.elements.name.value = name; f.elements.name.readOnly = existing || !!onDone;
  f.elements.label.value = label;
  $("secret-error").textContent = "";
  d.querySelector("h3").textContent = existing ? `Giá trị mới cho ${name}` : name ? `Nhập ${name}` : "Thêm secret";
  f.onsubmit = async (e) => {
    e.preventDefault();
    if (e.submitter?.value === "cancel") return d.close();
    const n = f.elements.name.value.trim(), v = f.elements.value.value;
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(n)) { $("secret-error").textContent = "Tên chỉ gồm chữ, số, _ (VD GITHUB_TOKEN)"; return; }
    if (!v) { $("secret-error").textContent = "Chưa nhập giá trị"; return; }
    const b = f.querySelector("button[value=save]"); b.disabled = true; b.textContent = "Đang gửi…";
    try { await saveSecret(n, f.elements.label.value.trim(), kind, v); f.elements.value.value = ""; d.close(); onDone?.(); }
    catch (err) { $("secret-error").textContent = err.message; }
    finally { b.disabled = false; b.textContent = "Lưu"; }
  };
  d.showModal();
  (name ? f.elements.value : f.elements.name).focus();
}

// `remotecc-secret ask NAME` prints remotecc-secret://ask?name=…&label=…: Claude needs a secret → secure input card instead of pasting in chat.
const SECRET_ASK = /`?remotecc-secret:\/\/ask\?([^\s`]+)`?/g;
function secretCards(n, text) {
  for (const m of (text || "").matchAll(SECRET_ASK)) {
    const q = new URLSearchParams(m[1]), name = q.get("name") || "";
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(name) || n.querySelector(`[data-secret="${name}"]`)) continue;
    const have = S.secrets.get(name), card = el("div", "secret-card");
    card.dataset.secret = name;
    const ic = el("span", "secret-ic"); ic.append(svg("lock", 18));
    const info = el("div", "grow"); info.append(el("div", "t", "Kho secret"), el("div", "sub", q.get("label") || name));
    const label = q.get("label") || "";
    card.append(ic, info, have ? el("span", "tag ok", "Đã lưu " + name)
                              : btn("Thêm", () => secretDialog({ name, label, kind: q.get("kind") || "" }), "primary small"));
    n.append(card);
  }
}

function syncTags(copies) {
  const hashes = new Set(copies.filter((c) => !c.linked).map((c) => c.hash));
  return copies.map((c) => el("span", "tag " + (c.linked ? "" : hashes.size > 1 ? "warn" : "ok"),
    `${c.label || c.machine} · ${c.linked ? "trong repo Git" : hashes.size > 1 ? "khác nhau" : "đã đồng bộ"}`));
}

function renderLibraryItem(box, it) {
  const v = S.view;
  box.append(btn("‹ Quay lại", () => { v.open = null; renderMessages(); }, "link lib-back"));
  if (v.kind === "artifacts") {
    const card = el("div", "artifact big");
    const frame = el("iframe"); loadArtifact(frame, it.url);
    frame.setAttribute("sandbox", "allow-scripts allow-popups allow-forms allow-modals");
    const bar = el("div", "artifact-bar", it.title || "Artifact");
    const right = el("span"); right.append(btn("Mở tab mới", () => openArtifactTab(it.url), "link"));
    bar.append(right); card.append(frame, bar); box.append(card);
  } else if (v.kind === "skills") {
    box.append(el("h2", "serif", it.name));
    const tags = el("div"); tags.append(...syncTags(it.copies)); box.append(tags);
    const c = it.copies.find((x) => !x.linked) || it.copies[0];
    const files = c.files || [];
    const md = files.find((f) => f.path === "SKILL.md");
    if (md?.text) box.append(markdown(md.text.replace(/^---[\s\S]*?---\s*/, "")));
    box.append(el("div", "side-section", `Tệp (${files.length})`));
    for (const f of files) {
      const r = el("div", "file-row"); r.append(el("span", null, f.path),
        el("span", f.blocked ? "blocked" : "muted small", f.blocked ? "không đồng bộ: " + f.blocked : Math.max(1, Math.round((f.size || 0) / 1024)) + " KB"));
      box.append(r);
    }
  } else {
    if (it.note) box.append(el("div", "note", it.note));
    box.append(markdown(it.text || ""));
    const a = el("div", "actions"); a.append(ibtn("copy", (b) => copy(it.text || "", b), "Chép")); box.append(a);
  }
}

// ---------------------------------------------------------------- rendering messages
function renderMessages() {
  if (guarded("messages", renderMessages)) return;
  renderMessagesInner();
  if (!$("findbar").classList.contains("hidden")) highlight(false);
}

// ---- find in conversation: marks every hit in the rendered messages, Enter / ⇧Enter walk them
const F = { hits: [], i: -1 };
function highlight(jump) {
  const box = $("messages"), q = $("find").value.trim().toLowerCase();
  box.querySelectorAll("mark.hit").forEach((m) => m.replaceWith(...m.childNodes));
  box.normalize();
  F.hits = [];
  if (q) {
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, { acceptNode: (n) =>
      n.parentElement.closest("button, .term-bar, input") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const text = n.nodeValue, lower = text.toLowerCase();
      let at = lower.indexOf(q); if (at < 0) continue;
      const frag = document.createDocumentFragment(); let last = 0;
      while (at >= 0) {
        frag.append(text.slice(last, at));
        const m = el("mark", "hit", text.slice(at, at + q.length)); frag.append(m); F.hits.push(m);
        last = at + q.length; at = lower.indexOf(q, last);
      }
      frag.append(text.slice(last)); n.replaceWith(frag);
    }
  }
  for (const m of F.hits) { const d = m.closest("details"); if (d) d.open = true; }
  if (jump) F.i = F.hits.length ? F.hits.length - 1 : -1;   // newest hit first
  else F.i = Math.min(F.i, F.hits.length - 1);
  showHit(jump);
}
function showHit(scroll = true) {
  F.hits.forEach((m, k) => m.classList.toggle("cur", k === F.i));
  $("find-count").textContent = $("find").value.trim() ? (F.hits.length ? `${F.i + 1}/${F.hits.length}` : "0 kết quả") : "";
  if (scroll && F.hits[F.i]) F.hits[F.i].scrollIntoView({ block: "center" });
}
function stepHit(d) { if (!F.hits.length) return; F.i = (F.i + d + F.hits.length) % F.hits.length; showHit(); }
function openFind() { $("findbar").classList.remove("hidden"); $("find").focus(); $("find").select(); if ($("find").value) highlight(true); }
function closeFind() { $("findbar").classList.add("hidden"); $("find").value = ""; highlight(false); }
$("find-btn").onclick = openFind;
$("find").oninput = () => highlight(true);
$("find").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); stepHit(e.shiftKey ? 1 : -1); } if (e.key === "Escape") closeFind(); };
$("find-prev").onclick = () => stepHit(-1); $("find-next").onclick = () => stepHit(1); $("find-close").onclick = closeFind;
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f" && ["chat", "terminal"].includes(S.view.kind)) { e.preventDefault(); openFind(); }
});

function renderMessagesInner() {
  const box = $("messages");
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  const v = S.view;
  if (v.kind === "terminal") {
    // Build off-screen; an unchanged view (most polls) keeps its nodes — no flicker, no lost hover / click.
    const tmp = document.createElement("div");
    renderTerminal(tmp, false);
    if (tmp.innerHTML === box.innerHTML) return;
    const top = box.scrollTop;
    box.replaceChildren(...tmp.childNodes);
    box.scrollTop = atBottom ? box.scrollHeight : top;
    return;
  }
  box.replaceChildren();
  if (v.kind === "terminal-new") return renderTerminalNew(box);
  if (LIB[v.kind]) return renderLibrary(box);
  if (!S.messages.length && !S.streaming) {
    const g = el("div", "greet"); const sp = el("div", "spark"); sp.append(logoImg()); g.append(sp, el("h2", null, `Claude Code trên ${tunnel.macName}`),
      el("p", "muted", "Chọn một phiên bên trái, hoặc bấm “Phiên Claude Code mới”."));
    box.append(g);
    return;
  }
  for (const m of S.messages) box.append(messageNode(m));
  if (S.streaming && S.streaming.conversationId === v.id) {
    const n = el("div", "msg assistant");
    if (S.streaming.text) n.append(markdown(S.streaming.text)); else { const t = el("div", "thinking"); t.append(logoImg("star")); n.append(t); }
    box.append(n);
  }
  if (atBottom) box.scrollTop = box.scrollHeight;
}

function messageNode(m) {
  const n = el("div", "msg " + (m.role === "user" ? "user" : "assistant"));
  const imgs = S.images.get(m.id);
  if (imgs?.length) { const w = el("div", "imgs"); imgs.forEach((src) => { const i = el("img"); i.src = src; w.append(i); }); n.append(w); }
  if (m.role === "user") { if (m.text) n.append(el("div", "bubble", m.text)); }
  else { n.append(markdown(m.text)); artifactCards(n, m.text); mediaCards(n, m.text); }
  const a = el("div", "actions");
  a.append(ibtn("copy", (b) => copy(m.text, b), "Chép"));
  a.append(ibtn("pin", () => updateDoc(doc(db, `clo/${S.uid}/messages/${m.id}`), { pinned: !m.pinned, editedAt: now() }), m.pinned ? "Bỏ ghim" : "Ghim", m.pinned ? "on" : ""));
  n.append(a);
  return n;
}

function renderTerminal(box, atBottom) {
  const s = S.session;
  if (s) {
    const ctx = Number(s.contextTokens || 0);
    const note = el("div", "note", `${s.machineLabel || s.machine} · ${s.cwd}` +
      (ctx ? ` · ${Math.round(ctx / 1000)}k token · ~$${(ctx * 5 / 1e6).toFixed(2)}/tin${ctx > 500000 ? " — sẽ tự nén ở tin tới" : ""}` : ""));
    if (ctx > 500000) note.style.color = "#c76a1a";
    note.append(" ", btn("Nén phiên", () => queueInbox(uuid(), {
      text: "/compact", sessionId: S.view.id, cwd: s.cwd, machine: s.machine, profile: $("profile").value, browser: false, fork: false,
      images: [] }).catch((e) => alert(e.message)), "link"));
    box.append(note);
  }
  const kids = S.terminal.filter((x) => x.parentId === S.view.id).sort((a, b) => b.editedAt - a.editedAt);
  if (kids.length) {
    const card = el("div", "card"); card.append(el("div", "head", "Phiên con"));
    for (const k of kids) {
      const row = el("div", "row");
      row.append(el("span", "t", (k.title || "").replace(/^↳ /, "")),
                 el("span", "state" + (k.working || k.needsInput ? " on" : ""), k.working ? "đang chạy" : k.needsInput ? "cần bạn trả lời" : "xong"));
      row.onclick = () => openTerminal(k.id);
      card.append(row);
    }
    box.append(card);
  }
  const queued = S.inbox.filter((r) => ["pending", "running", "cancel", "injected"].includes(r.status));
  const recentDone = S.inbox.filter((r) => !queued.includes(r));
  let turns = s?.transcript || [];
  // Cut the transcript before a running turn so it isn't shown twice.
  const run = queued.find((r) => r.status === "running");
  if (run) { const i = turns.map((t) => t.role === "user" && t.text.trim().startsWith(run.text.trim().slice(0, 60))).lastIndexOf(true); if (i >= 0) turns = turns.slice(0, i); }
  // One reply = one row: merge consecutive assistant turns so their tool calls share one terminal.
  const merged = [];
  for (const t of turns) {
    const last = merged[merged.length - 1];
    if (t.role !== "user" && last && last.role !== "user") { last.text += "\n" + t.text; last.cost = (last.cost || 0) + (t.cost || 0); }
    else merged.push({ ...t });
  }
  for (const t of merged) { const n = turnNode(t.role, t.text, t.cost); if (t.ts) n.dataset.at = tsDate(t.ts).getTime(); box.append(n); }
  // Finished turns the mirrored transcript doesn't have yet.
  // Search the whole transcript (tool-heavy turns push a finished one far past any tail window); requests are in send
  // order, so once a later one is in the transcript every earlier one is too.
  const userTexts = turns.filter((t) => t.role === "user").map((t) => t.text.trim());
  const seen = (r) => userTexts.some((x) => x.startsWith(r.text.trim().slice(0, 60)));
  const done = recentDone.slice(-3);
  const lastSeen = done.map(seen).lastIndexOf(true);
  for (const r of done.slice(lastSeen + 1)) {
    if (tsDate(r.createdAt) < Date.now() - 600000 || seen(r)) continue;
    box.append(requestNode(r));
    if (r.reply) box.append(turnNode("assistant", r.reply));
    if (r.error && r.status !== "cancelled") box.append(el("div", "error small", "⚠️ " + r.error));
  }
  const waiting = queued.filter((r) => r.status === "pending");
  if (s?.openOnMac) {
    // Open in a terminal on the Mac: the bridge holds messages until that terminal leaves the session, so two claude
    // processes never write one transcript. "Chạy luôn" lets them run anyway (the bridge's `force`).
    const note = el("div", "chip", `Phiên này đang mở trong terminal trên ${tunnel.macName} — tin từ web chờ tới khi thoát terminal.`);
    if (waiting.length) note.append(btn(`Chạy luôn (${waiting.length} tin)`, () =>
      Promise.all(waiting.map((r) => updateDoc(doc(db, `clo/${S.uid}/terminalInbox/${r.id}`), { force: true, editedAt: now() }))), "link"));
    box.append(note);
  }
  for (const r of queued) {
    const n = requestNode(r);
    const chip = el("div", "chip");
    if (r.status === "pending") {
      chip.append(el("span", null, `Chờ #${waiting.indexOf(r) + 1}`));
      if (run) chip.append(btn("Ngắt và chạy ngay", () => runNow(r), "link"));
      if (waiting.indexOf(r) > 0) chip.append(btn("Đưa lên đầu", () => toFront(r), "link"));
      chip.append(btn("Huỷ", () => updateDoc(doc(db, `clo/${S.uid}/terminalInbox/${r.id}`), { status: "cancel", editedAt: now() }), "link"));
    } else if (r.status === "injected") {
      // Already handed to the running turn: stopping it makes the bridge put this message back at the head of the queue.
      chip.append(el("span", null, "Claude đã nhận — đọc sau bước đang làm"));
      if (run) chip.append(btn("Ngắt và chạy ngay", () => updateDoc(doc(db, `clo/${S.uid}/terminalInbox/${run.id}`), { status: "cancel", editedAt: now() }), "link"));
    } else chip.append(el("span", r.status === "running" ? "live" : "", r.status === "cancel" ? "Đang dừng…" : "Đang chạy"));
    n.append(chip);
    box.append(n);
    if (r.status === "running" || r.status === "cancel") {
      if (r.reply) box.append(turnNode("assistant", r.reply));
      const act = (s?.state === "working" && s?.activity) || lastLine(r.reply) || "Đang suy nghĩ…";
      if (act.startsWith("🔧 ")) { const w = el("div"); termLine(w, act); const t = w.firstChild; t.classList.add("running");
        t.querySelector(".term-bar span").textContent = "đang chạy"; t.querySelector(".term-body").append(el("div", "cursor")); box.append(t); }
      else box.append(thinking());
    }
  }
  const onMac = s?.state === "working" && s?.activityAt && Date.now() - tsDate(s.activityAt) < 120000;
  if (!queued.length && onMac) {
    box.append(el("div", "activity", "Trên máy: " + (s.activity || "Đang làm việc…")));
  } else if (!queued.length && s?.bgTasks?.length) {
    box.append(el("div", "activity", bgLabel(s.bgTasks) + " — xong sẽ báo"));
  }
  // /btw: the side thread shows in the floating chat head (renderBtwDock) from the moment it's asked.
  const btwAnswer = (r) => (r.reply || "").split("\n").filter((l) => !l.startsWith("🔧")).join("\n").trim();
  renderBtwDock(btwAnswer);
  // Next-step suggestions (bridge, Sonnet) under the last reply, until a new turn starts.
  if (!queued.length && s?.suggestions?.length && s.suggestFor === s.turnCount) {
    const sug = el("div", "suggest"); sug.append(el("div", "label", "Gợi ý tiếp theo"));
    s.suggestions.forEach((t, i) => { const b = btn(t, () => { input.value = t; send(); }); b.prepend(el("span", "num", String(i + 1))); sug.append(b); });
    box.append(sug);
  }
  S.running = run;
  $("stop").classList.toggle("hidden", !run);
  updateSend();
  if (atBottom) box.scrollTop = box.scrollHeight;
}

function renderTerminalNew(box) {
  const v = S.view;
  box.append(el("div", "note", `Phiên Claude Code mới trên ${v.label} · ${v.cwd}. Tin đầu tiên sẽ tạo phiên.`));
  for (const r of S.newReqs) {
    box.append(requestNode(r));
    if (r.reply) box.append(turnNode("assistant", r.reply));
    if (["pending", "running"].includes(r.status)) box.append(el("div", "activity", r.status === "pending" ? "Đang chờ Mac nhận…" : (lastLine(r.reply) || "Đang khởi tạo phiên…")));
    if (r.error && r.status === "error") box.append(el("div", "error small", "⚠️ " + r.error));
  }
  box.scrollTop = box.scrollHeight;
}

// A turn queued through terminalInbox: photos travel inline as base64 until the bridge mirrors them.
function requestNode(r) {
  const imgs = r.images || [];
  const text = imgs.length && ["Xem ảnh đính kèm.", "Xem file đính kèm."].includes(r.text) ? "" : r.text;
  const n = turnNode("user", text);
  if (imgs.length) {
    const w = el("div", "imgs");
    imgs.forEach((b64) => { const i = el("img"); i.src = "data:image/jpeg;base64," + b64; w.append(i); });
    n.prepend(w);
  }
  return n;
}

// RemoteCC artifacts live on the Mac (remotecc://artifact/<id>): the HTML comes through the tunnel into a sandboxed iframe.
const ARTIFACT = /remotecc:\/\/artifact\/[A-Za-z0-9_-]{6,40}/g;
const artifactHtml = new Map();
async function artifactSource(url) {
  const aid = url.split("/").pop();
  if (!artifactHtml.has(aid)) artifactHtml.set(aid, tunnel.op("artifact", { aid }, 120_000).then((r) => r.html).catch((e) => { artifactHtml.delete(aid); throw e; }));
  return artifactHtml.get(aid);
}
function loadArtifact(frame, url) {
  frame.srcdoc = '<p style="font:14px system-ui;color:#888;padding:16px">Đang tải từ Mac…</p>';
  artifactSource(url).then((h) => { frame.srcdoc = h; }).catch((e) => { frame.srcdoc = `<p style="font:14px system-ui;color:#c33;padding:16px">${e.message}</p>`; });
}
async function openArtifactTab(url) {
  try { window.open(URL.createObjectURL(new Blob([await artifactSource(url)], { type: "text/html" })), "_blank", "noopener"); }
  catch (e) { alert(e.message); }
}
function artifactCards(n, text) {
  for (const url of new Set((text || "").match(ARTIFACT) || [])) {
    const card = el("div", "artifact");
    const frame = el("iframe"); frame.loading = "lazy"; loadArtifact(frame, url);
    frame.setAttribute("sandbox", "allow-scripts allow-popups allow-forms allow-modals");
    const bar = el("div", "artifact-bar", "Artifact");
    const right = el("span"); right.append(btn("Mở tab mới", () => openArtifactTab(url), "link"));
    bar.append(right); card.append(frame, bar); n.append(card);
  }
}

// Files Claude sent into the chat (`remotecc-send FILE` → remotecc://media/<id>): fetched from the Mac in 1 MB chunks
// (tunnel op media), then shown inline — image, video/audio player, or a download link.
const MEDIA = /remotecc:\/\/media\/[A-Za-z0-9_-]{6,40}/g;
const mediaBlobs = new Map();
function mediaSource(mid, progress) {
  if (!mediaBlobs.has(mid)) mediaBlobs.set(mid, (async () => {
    const parts = []; let off = 0, meta = null;
    do {
      const r = await tunnel.op("media", { mid, offset: off, length: 1048576 }, 120_000);
      meta = r; const bin = atob(r.data || ""); const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      if (!u8.length) break;
      parts.push(u8); off += u8.length; progress?.(off, r.size);
    } while (off < meta.size);
    return { ...meta, data: undefined, url: URL.createObjectURL(new Blob(parts, { type: meta.mime })) };
  })().catch((e) => { mediaBlobs.delete(mid); throw e; }));
  return mediaBlobs.get(mid);
}
const fmtSize = (b) => b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
function mediaCards(n, text) {
  for (const url of new Set((text || "").match(MEDIA) || [])) {
    const mid = url.split("/").pop(), card = el("div", "artifact media");
    const status = el("div", "artifact-bar", EN ? "Loading from the Mac…" : "Đang tải từ Mac…");
    card.append(status); n.append(card);
    mediaSource(mid, (got, size) => { status.textContent = (EN ? "Loading " : "Đang tải ") + fmtSize(got) + " / " + fmtSize(size); }).then((m) => {
      const kind = (m.mime || "").split("/")[0];
      let view = null;
      if (kind === "image") { view = el("img"); view.src = m.url; view.alt = m.name; view.style.cssText = "display:block;max-width:100%;max-height:520px;margin:auto;cursor:zoom-in"; view.onclick = () => window.open(m.url, "_blank", "noopener"); }
      else if (kind === "video") { view = el("video"); view.src = m.url; view.controls = true; view.playsInline = true; view.style.cssText = "display:block;width:100%;max-height:520px;background:#000"; }
      else if (kind === "audio") { view = el("audio"); view.src = m.url; view.controls = true; view.style.cssText = "display:block;width:100%;padding:8px 0"; }
      status.textContent = "";
      status.append(el("span", "", (m.title || m.name) + " · " + fmtSize(m.size)));
      const a = el("a", "link", EN ? "Save" : "Tải về"); a.href = m.url; a.download = m.name;
      const right = el("span"); right.append(a); status.append(right);
      if (view) card.insertBefore(view, status);
    }).catch((e) => { status.textContent = "⚠︎ " + e.message; });
  }
}

// Tool calls as a desktop-style terminal window; consecutive calls share one window.
function termLine(n, line) {
  let win = n.lastElementChild?.classList.contains("term") ? n.lastElementChild : null;
  if (!win) {
    win = el("div", "term");
    const bar = el("div", "term-bar"); bar.innerHTML = "<i></i><i></i><i></i><span>zsh</span>";
    win.append(bar, el("div", "term-body")); n.append(win);
    win.onclick = () => win.classList.toggle("open");
  }
  const [tool, ...rest] = line.slice(2).trim().split(":"), arg = rest.join(":").trim().replaceAll(" ⏎ ", "\n  ");
  const row = el("div", "term-row"), shell = tool === "Bash";
  row.append(el("span", shell ? "p" : "t", shell ? "$ " : `› ${tool} `), arg);
  const body = win.querySelector(".term-body"); body.append(row);
  const k = body.children.length; win.querySelector(".term-bar span").textContent = k > 1 ? `zsh — ${k} lệnh` : "zsh";
}

// "Đã chạy 2 lệnh, đọc 1 tệp ›": a finished tool group collapses to one line; click shows the terminal window.
const TOOL_WORDS = EN ? { Bash: "ran %d commands", Read: "read %d files", Write: "created %d files", Edit: "edited %d files", MultiEdit: "edited %d files",
  Grep: "searched %d times", Glob: "searched %d times", WebFetch: "fetched %d pages", WebSearch: "searched the web %d times", Agent: "delegated %d tasks", Task: "delegated %d tasks" }
  : { Bash: "chạy %d lệnh", Read: "đọc %d tệp", Write: "tạo %d tệp", Edit: "sửa %d tệp", MultiEdit: "sửa %d tệp",
  Grep: "tìm kiếm %d lần", Glob: "tìm kiếm %d lần", WebFetch: "tra web %d lần", WebSearch: "tra web %d lần", Agent: "giao %d việc cho agent", Task: "giao %d việc cho agent" };
const VERBS = EN ? ["Thinking", "Pondering", "Mulling", "Tinkering", "Brewing", "Weaving", "Mixing", "Weighing", "Composing", "Imagining"]
  : ["Đang nghĩ", "Đang nhào nặn", "Đang suy tính", "Đang mày mò", "Đang ấp ủ", "Đang xâu chuỗi", "Đang pha chế", "Đang cân nhắc", "Đang dệt chữ", "Đang hình dung"];
// RemoteCC's mark (same as the iOS app icon) wherever the page shows a logo or the "working" indicator.
function logoImg(cls = "mark") { const i = el("img", cls); i.src = "/logo.svg"; i.alt = ""; return i; }

function thinking() {
  const n = el("div", "thinking"); n.append(logoImg("star"), el("span", "", VERBS[Math.floor(Date.now() / 3000) % VERBS.length] + "…"));
  return n;
}
function collapseTerm(term) {
  const count = new Map(), skills = [];
  for (const r of term.querySelectorAll(".term-row")) {
    const tool = r.querySelector(".p") ? "Bash" : (r.querySelector(".t")?.textContent || "").replace("›", "").trim();
    if (tool === "Skill") { skills.push((EN ? "ran skill /" : "chạy skill /") + r.lastChild.textContent.trim()); continue; }
    const k = TOOL_WORDS[tool] || (EN ? "used %d tools" : "dùng %d công cụ"); count.set(k, (count.get(k) || 0) + 1);
  }
  const parts = [...count].map(([k, v]) => k.replace("%d", v)).concat(skills);
  const d = el("details", "tools"); const sum = el("summary", "", EN ? (parts.join(", ") || "used tools").replace(/^./, (c) => c.toUpperCase())
    : "Đã " + (parts.join(", ") || "dùng công cụ"));
  term.replaceWith(d); d.append(sum, term);
}

function turnNode(role, text, cost) {
  const n = el("div", "msg " + (role === "user" ? "user" : "assistant"));
  if (role === "user") {
    const lines = (text || "").split("\n");
    for (const l of lines.filter((x) => x.startsWith("🖼 "))) n.append(agentImage(l.split(" ")[1]));
    const body = lines.filter((x) => !x.startsWith("🖼 ")).join("\n").trim();
    if (body) { n.append(el("div", "bubble", body)); const a = el("div", "actions"); a.append(ibtn("copy", (b) => copy(body, b), "Chép")); n.append(a); }
    return n;
  }
  const lines = (text || "").split("\n");
  for (const l of lines.filter((x) => x.startsWith("🔧 "))) termLine(n, l);
  let prose = [];
  const flush = () => { if (prose.join("").trim()) n.append(markdown(prose.join("\n"))); prose = []; };
  for (const line of (text || "").split("\n")) {
    if (line.startsWith("🖼 ")) { flush(); n.append(agentImage(line.split(" ")[1])); }
    else if (!line.startsWith("🔧 ")) prose.push(line.replace(SECRET_ASK, "").trimEnd());
  }
  flush();
  for (const t of [...n.querySelectorAll(":scope > .term")]) collapseTerm(t);
  artifactCards(n, text);
  mediaCards(n, text);
  secretCards(n, text);
  const plain = (text || "").split("\n").filter((l) => !l.startsWith("🔧 ") && !l.startsWith("🖼 ")).join("\n").trim();
  if (plain || cost > 0) {
    const a = el("div", "actions");
    if (plain) a.append(ibtn("copy", (b) => copy(plain, b), "Chép"));
    if (cost > 0) { const c = el("span", "cost", cost < 0.01 ? "<$0.01" : "$" + cost.toFixed(2)); c.title = "Chi phí ước tính"; a.append(c); }
    n.append(a);
  }
  return n;
}

// Image the agent produced on the Mac ("🖼 <id> <name>"), published by the bridge to Firestore.
const agentImages = new Map();
function agentImage(id) {
  const img = el("img", "agent-img");
  img.alt = "Ảnh từ Claude Code";
  const show = (url) => { img.src = url; img.onclick = () => window.open(url, "_blank"); };
  if (agentImages.has(id)) show(agentImages.get(id));
  else getDoc(doc(db, `clo/${S.uid}/terminalImages/${id}`)).then((d) => {
    const data = d.data()?.data;
    if (!data) throw new Error("no image");
    const url = URL.createObjectURL(new Blob([data.toUint8Array()], { type: "image/jpeg" }));
    agentImages.set(id, url); show(url);
  }).catch(() => img.replaceWith(el("div", "muted small", "Không tải được ảnh")));
  return img;
}

function markdown(text) {
  const d = el("div", "md");
  d.innerHTML = DOMPurify.sanitize(marked.parse(text || "", { breaks: true }));
  d.querySelectorAll("pre").forEach((pre) => pre.onclick = () => {
    navigator.clipboard.writeText(pre.innerText); pre.classList.add("copied"); setTimeout(() => pre.classList.remove("copied"), 1500);
  });
  d.querySelectorAll("a").forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
  return d;
}

function btn(label, fn, cls = "") { const b = el("button", cls, label); b.onclick = () => fn(b); return b; }
async function copy(text, b) {
  await navigator.clipboard.writeText(text);
  const old = [...b.childNodes];
  b.replaceChildren(b.classList.contains("ibtn") ? svg("check") : "Đã chép"); b.classList.add("done");
  setTimeout(() => { b.replaceChildren(...old); b.classList.remove("done"); }, 1200);
}

// ---------------------------------------------------------------- images
async function loadImages() {
  for (const m of S.messages) {
    if (m.role !== "user" || S.images.has(m.id)) continue;
    S.images.set(m.id, []);
    const snap = await getDocs(query(collection(db, `clo/${S.uid}/attachments`), where("messageId", "==", m.id)));
    const imgs = snap.docs.map((d) => d.data()).filter((a) => !a.deleted && a.data).sort((a, b) => (a.index || 0) - (b.index || 0))
      .map((a) => "data:image/jpeg;base64," + a.data.toBase64());
    if (imgs.length) { S.images.set(m.id, imgs); renderMessages(); }
  }
}

// One "+" for photos and files: images go inline (resized), other files upload with the turn (Claude Code only).
$("file").onchange = async (e) => {
  for (const f of e.target.files) {
    if (f.type.startsWith("image/")) await addImage(f);
    else if (S.view.kind.startsWith("terminal") && S.files.length < 10) S.files.push(f);
    else alert(`${f.name}: chat thường chỉ nhận ảnh — gửi file trong phiên Claude Code.`);
  }
  e.target.value = ""; renderFiles();
};

function renderFiles() {
  const box = $("files"); box.replaceChildren();
  S.files.forEach((f, i) => {
    const chip = el("span", null, `📎 ${f.name} · ${Math.max(1, Math.round(f.size / 1024))} KB`);
    chip.append(ibtn("x", () => { S.files.splice(i, 1); renderFiles(); }, "Bỏ"));
    box.append(chip);
  });
  updateSend();
}

// ---- slash suggestions (terminal views): commands reported by that Mac's bridge
function slashCommands() {
  const machine = S.view.machine || S.session?.machine || S.terminal.find((x) => x.id === S.view.id)?.machine;
  const b = S.bridges.find((x) => x.machine === machine);
  return ["clear", "btw", ...((b?.slashCommands || []).filter((c) => !c.startsWith("__") && !["clear", "btw"].includes(c)))];
}
function hideSlash() { $("slash").classList.add("hidden"); }
function updateSlash() {
  const v = input.value;
  if (!S.view.kind.startsWith("terminal") || !v.startsWith("/") || /\s/.test(v)) return hideSlash();
  const q = v.slice(1).toLowerCase();
  const hits = slashCommands().filter((c) => c.toLowerCase().includes(q))
    .sort((a, b) => (a.toLowerCase().startsWith(q) ? 0 : 1) - (b.toLowerCase().startsWith(q) ? 0 : 1) || a.localeCompare(b)).slice(0, 10);
  const box = $("slash"); box.replaceChildren();
  for (const c of hits) {
    const row = el("div"); row.append(el("span", null, "/" + c));
    if (c === "clear") row.append(el("span", "muted small", "phiên mới"));
    if (c === "btw") row.append(el("span", "muted small", "hỏi bên lề, không cắt ngang"));
    row.onclick = () => { input.value = `/${c} `; hideSlash(); input.focus(); updateSend(); };
    box.append(row);
  }
  box.classList.toggle("hidden", !hits.length);
}
$("slash-btn").onclick = () => { if (!input.value.startsWith("/")) input.value = "/" + input.value; input.focus(); updateSlash(); };
$("branches").onclick = () => { renderBranches(); $("branch-sheet").showModal(); };

$("input").addEventListener("paste", async (e) => {
  const files = [...(e.clipboardData?.items || [])].filter((i) => i.type.startsWith("image/")).map((i) => i.getAsFile());
  if (files.length) { e.preventDefault(); for (const f of files) await addImage(f); }
});
$("composer").addEventListener("dragover", (e) => e.preventDefault());
$("composer").addEventListener("drop", async (e) => { e.preventDefault(); for (const f of e.dataTransfer.files) if (f.type.startsWith("image/")) await addImage(f); });

async function addImage(file) {
  if (S.pending.length >= 5) return;
  const bmp = await createImageBitmap(file);
  const max = S.view.kind === "terminal" ? 1024 : 1568, scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) });
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  let q = 0.8, url = c.toDataURL("image/jpeg", q);
  while (url.length > 900_000 && q > 0.35) { q -= 0.15; url = c.toDataURL("image/jpeg", q); }   // stays under Firestore's doc cap
  S.pending.push(url);
  renderThumbs();
}

function renderThumbs() {
  const t = $("thumbs"); t.replaceChildren();
  S.pending.forEach((src, i) => { const w = el("div"); const im = el("img"); im.src = src; w.append(im, ibtn("x", () => { S.pending.splice(i, 1); renderThumbs(); }, "Bỏ ảnh")); t.append(w); });
  updateSend();
}

// ---------------------------------------------------------------- composer
const input = $("input");
input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = input.scrollHeight + "px"; updateSend(); updateSlash(); });
// Enter queues; Ctrl/⌘+Enter interrupts the running turn and sends now (the app's long-press ↑).
input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(e.metaKey || e.ctrlKey); } });
$("send").onclick = () => send();
$("stop").onclick = () => stop();
function updateSend() {
  const has = !!input.value.trim() || S.pending.length || S.files.length;
  $("send").disabled = !has;
}
// Manual /compact (the select only sets the auto threshold).
$("compact-now").onclick = () => {
  const s = S.session;
  if (S.view.kind !== "terminal" || !s) return alert("Gửi tin đầu tiên trước — phiên mới chưa có gì để nén.");
  if (!confirm("Nén phiên này ngay (/compact)?")) return;
  queueInbox(uuid(), { text: "/compact", sessionId: S.view.id, cwd: s.cwd, machine: s.machine, profile: $("profile").value,
    browser: false, fork: false, images: [] }).catch((e) => alert(e.message));
};
updateSend();

// Vibecoding (cử chỉ + giọng nói) — Claude Code views only.
const ACTIVE = ["pending", "running", "cancel", "injected"];
$("vibe-btn").innerHTML = handIcon();
const vibe = createVibe({
  bar: $("vibe-bar"), button: $("vibe-btn"), menu: $("vibe-menu"),
  isBusy: () => S.view.kind.startsWith("terminal") && S.inbox.some((r) => ACTIVE.includes(r.status)),
  lastReply: () => {   // trailing assistant turns of the transcript
    const t = S.session?.transcript || []; let out = "";
    for (let i = t.length - 1; i >= 0 && t[i].role !== "user"; i--) out = t[i].text + "\n" + out;
    return out;
  },
  getInput: () => input.value,
  setInput: (t) => { input.value = t; input.dispatchEvent(new Event("input")); },
  send: () => send(),
  stop: () => stop(),
  suggestions: () => { const s = S.session; return s?.suggestions?.length && s.suggestFor === s.turnCount ? s.suggestions.slice(0, 3) : []; },
});
for (const [id, key, def] of [["profile", "clo.profile", "claude-yolo"], ["effort", "clo.effort", ""], ["compact", "clo.compactAt", "400000"]]) {
  $(id).value = (localStorage.getItem(key) ?? def).replace(/^vertex/, "claude");  // Vertex profiles retired
  if (!$(id).value) $(id).value = def;
  $(id).onchange = () => {
    const v = S.view, s = v.kind === "terminal" ? (S.session || S.terminal.find((x) => x.id === v.id)) : null;
    const was = s ? (s.agent === "codex" || s.agent === "agy" ? s.agent : "claude") : null;
    if (id === "profile" && was && agentOf($(id).value) !== was) {
      // Another agent can't continue this conversation: a new session with it in the same folder (like /clear) —
      // never mid-turn, and only where the session's folder is known.
      if (S.inbox.some((r) => ACTIVE.includes(r.status)) || !s.machine || !s.cwd) { $(id).value = $(id).dataset.prev || was; return renderStatus(); }
      localStorage.setItem(key, $(id).value);
      openTerminalNew(s.machine, s.cwd, s.machineLabel || s.machine);
      return;
    }
    localStorage.setItem(key, $(id).value);
    renderStatus();
  };
}
fillModels(agentOf($("profile").value));
$("tmodel").onchange = () => { localStorage.setItem("clo.tmodel." + $("tmodel").dataset.agent, $("tmodel").value); renderStatus(); };

async function send(interrupt = false) {
  const text = input.value.trim();
  if (!text && !S.pending.length && !S.files.length) return;
  const images = S.pending.splice(0); renderThumbs();
  const files = S.files.splice(0); renderFiles();
  input.value = ""; input.style.height = "auto"; updateSend(); hideSlash();
  if (S.view.kind.startsWith("terminal")) return sendTerminal(text || (files.length ? "Xem file đính kèm." : "Xem ảnh đính kèm."), images, files, interrupt);
}

// Just before the first waiting turn, so the bridge runs this one next.
function frontDate() {
  const first = Math.min(Date.now(), ...S.inbox.filter((r) => r.status === "pending").map((r) => tsDate(r.createdAt)));
  return Timestamp.fromMillis(first - 1);
}

// Interrupt the running turn and run this one next. Reorder first, then stop: the bridge must see it at the head.
async function runNow(r) {
  const running = S.inbox.find((x) => x.status === "running");
  await updateDoc(doc(db, `clo/${S.uid}/terminalInbox/${r.id}`), { createdAt: frontDate(), interrupt: true, editedAt: now() });
  if (running) await updateDoc(doc(db, `clo/${S.uid}/terminalInbox/${running.id}`), { status: "cancel", editedAt: now() });
}

// Move a waiting message to the head of the queue (runs right after the current turn, no interrupt).
async function toFront(r) {
  await updateDoc(doc(db, `clo/${S.uid}/terminalInbox/${r.id}`), { createdAt: frontDate(), editedAt: now() });
}

function stop() {
  if (S.view.kind === "terminal") {
    const run = S.inbox.find((r) => r.status === "running");
    if (run) updateDoc(doc(db, `clo/${S.uid}/terminalInbox/${run.id}`), { status: "cancel", editedAt: now() });
  } else S.streaming?.abort?.abort();
}

// ---------------------------------------------------------------- Claude Code turn → bridge inbox (queued; bridge runs in send order)
// A file → the Mac in ~384 KB chunks (the relay moves ~65 KB/s: big files take a while, the title shows progress).
async function uploadFile(rid, f) {
  if (f.size > 100 * 1024 * 1024) throw new Error(`${f.name} quá lớn (tối đa 100 MB)`);
  const size = 384 * 1024, total = Math.max(1, Math.ceil(f.size / size));
  for (let i = 0; i < total; i++) {
    const buf = new Uint8Array(await f.slice(i * size, (i + 1) * size).arrayBuffer());
    let bin = ""; for (let j = 0; j < buf.length; j += 0x8000) bin += String.fromCharCode(...buf.subarray(j, j + 0x8000));
    $("status").textContent = `Đang gửi ${f.name} lên Mac… ${Math.round(((i + 1) / total) * 100)}%`;
    for (let attempt = 1; ; attempt++) {   // a dropped connection mid-file: resend this chunk (the Mac ignores a duplicate)
      try { await tunnel.op("upload", { rid, name: f.name, index: i, total, offset: i * size, data: btoa(bin) }, 120_000); break; }
      catch (e) { if (attempt >= 4) throw e; await new Promise((r) => setTimeout(r, attempt * 2000)); }
    }
  }
  renderStatus();
}

// Messages this tab sent that the Mac's inbox list doesn't show yet: drawn as "waiting" at once (no 1.5 s+ of nothing).
function mergeLocalReqs() {
  const have = new Set(S.inbox.map((r) => r.id));
  for (const [id, r] of S.localReqs) {
    if (have.has(id) || Date.now() - r.at > 120_000) S.localReqs.delete(id);
    else if (S.view.kind === "terminal" && r.sessionId === S.view.id) S.inbox.push(r);
  }
  S.inbox.sort((a, b) => tsDate(a.createdAt) - tsDate(b.createdAt));
}

async function sendTerminal(text, images, files = [], interrupt = false) {
  const v = S.view;
  const s0 = v.kind === "terminal" ? (S.session || S.terminal.find((x) => x.id === v.id)) : null;
  const machine = v.kind === "terminal-new" ? v.machine : s0?.machine;
  const cwd = v.kind === "terminal-new" ? v.cwd : s0?.cwd;
  if (!machine || !cwd) return;
  if (text === "/clear") {   // `claude -p` can't clear a session → fresh one in the same folder
    const label = v.kind === "terminal-new" ? v.label : (s0.machineLabel || s0.machine);
    return openTerminalNew(machine, cwd, label);
  }
  // While Claude works, a plain message waits in the queue (the Mac hands it to Claude when it can); a side question
  // that doesn't touch the main turn is asked with /btw and lives in the floating bubble.
  const autoBtw = false;
  const btwQ = v.kind === "terminal" && /^\/btw\s+\S/i.test(text) ? text.replace(/^\/btw\s+/i, "") : autoBtw ? text : null;
  const fork = v.kind === "terminal" && (text.startsWith("/") || autoBtw);   // slash command / btw → side branch, main chat untouched
  const rid = uuid();
  const ref = doc(db, `clo/${S.uid}/terminalInbox/${rid}`);
  try {
    for (const f of files) await uploadFile(rid, f);
  } catch (e) { alert("Không gửi file được: " + e.message); return; }
  const local = v.kind === "terminal" && !fork
    ? { id: rid, text, sessionId: v.id, status: "pending", reply: "", createdAt: now(), at: Date.now() } : null;
  if (local) { S.localReqs.set(rid, local); S.inbox.push(local); mergeLocalReqs(); S.inbox = [...new Map(S.inbox.map((r) => [r.id, r])).values()]; renderMessages(); }
  try {
    const env = v.kind === "terminal-new" ? v.env : null;
    await queueInbox(rid, {
      text: btwQ ? `A side question (/btw) while this session works on its main task: ${btwQ}\n\nAnswer briefly from the session context, in the language the question is written in. Don't edit files, don't run commands that change anything, don't continue the main task.` : text,
      sessionId: v.kind === "terminal" ? v.id : "", cwd, machine, profile: $("profile").value, browser: true, fork,
      ...(btwQ ? { btw: true, btwQ, thread: rid } : {}),
      interrupt: !!(interrupt && !fork), effort: $("effort").value, model: $("tmodel").value, compactAt: Number($("compact").value),
      addDirs: env?.addDirs || [], worktree: !!env?.worktree,
      images: images.map((u) => u.split(",")[1]), fileNames: files.map((f) => f.name),
      createdAt: interrupt && !fork ? frontDate() : now() });
  } catch (e) {
    if (local) { S.localReqs.delete(rid); S.inbox = S.inbox.filter((r) => r.id !== rid); renderMessages(); input.value ||= text; }
    alert("Không gửi được: " + e.message); return;
  }
  const running = interrupt && !fork && v.kind === "terminal" && S.inbox.find((x) => x.status === "running");
  if (running) await updateDoc(doc(db, `clo/${S.uid}/terminalInbox/${running.id}`), { status: "cancel", editedAt: now() });
  if (fork) {
    const run = { id: rid, command: btwQ || text, btw: !!btwQ, thread: rid, status: "pending", reply: "", error: "", at: Date.now() };
    S.branchRuns.unshift(run);
    S.viewUnsub.push(onSnapshot(ref, (d) => { Object.assign(run, d.data() || {}, { command: run.command }); renderBranches(); renderTitle(); if (run.btw) renderMessages(); }));
    renderBranches(); renderTitle();
    if (btwQ) { btwSetHidden(false); BTW.open = true; BTW.cur = rid; renderMessages(); } else $("branch-sheet").open || $("branch-sheet").showModal();
  } else if (v.kind === "terminal-new") {
    const req = { id: rid, text, status: "pending", reply: "" };
    S.newReqs.push(req);
    S.viewUnsub.push(onSnapshot(ref, (d) => {
      Object.assign(req, d.data() || {});
      if (["done", "error", "cancelled"].includes(req.status) && req.resultSessionId && S.view.kind === "terminal-new") {
        setTimeout(() => { loadTerminalList(); openTerminal(req.resultSessionId); }, 1500);   // bridge rescans right after finishing
      }
      renderMessages();
    }));
    renderMessages();
  }
}

// Sub-session: a fork of this session that stays its own session; the bridge reports each finished turn back here.
$("spawn").onclick = async () => {
  const s = S.session, task = (prompt("Việc cho phiên con (mang ngữ cảnh phiên này, chạy song song, báo kết quả về đây):") || "").trim();
  if (!task || !s || S.view.kind !== "terminal") return;
  try {
    await queueInbox(uuid(), { text: "You are a child session split off from the main session (context above) to do one task, in parallel with it.\n"
      + "Do only this task, don't continue the main work. End with a short \"Result:\" summary — it is reported back to the main session.\n\nTASK: " + task,
      sessionId: S.view.id, cwd: s.cwd, machine: s.machine, profile: $("profile").value, browser: true, child: true, effort: $("effort").value });
    alert("Đã tách phiên con — nó hiện trong thẻ Phiên con sau vài giây.");
  } catch (e) { alert("Không tách được: " + e.message); }
};

function renderBranches() {
  const list = $("branch-list"); list.replaceChildren();
  const runs = S.branchRuns.filter((r) => !r.btw);
  if (!runs.length) list.append(el("p", "muted", "Gõ /lệnh trong một phiên — lệnh chạy trên bản sao của phiên, kết quả hiện ở đây."));
  for (const r of runs) {
    const box = el("div", "run");
    box.append(el("div", "cmd", `${r.command}  ${["pending", "running"].includes(r.status) ? "· đang chạy…" : ""}`));
    if (r.reply) box.append(turnNode("assistant", r.reply));
    if (r.error) box.append(el("div", "error small", r.error));
    list.append(box);
  }
}

function stopAudio() {}

// ---------------------------------------------------------------- utils
function tsDate(t) { return t?.toDate ? t.toDate() : t instanceof Date ? t : t ? new Date(t) : new Date(0); }
function lastLine(t) { return (t || "").trim().split("\n").filter(Boolean).pop() || ""; }
function rel(d) {
  const s = (Date.now() - d) / 1000;
  if (s < 60) return "vừa xong"; if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`; return `${Math.floor(s / 86400)} ngày trước`;
}

boot();
