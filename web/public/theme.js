// Themes for the web app. Stored per browser: localStorage clo.theme = "default" | "xmas" | "custom:<id>", and the custom
// theme itself in clo.customTheme (so it paints before the Mac answers). "xmas" = Let it snow (pine/berry + snow).
// Custom themes are vibecoded: the user describes one, Claude Code on their Mac writes it (bridge op theme.make), the
// bridge checks it (colors, font, background, particles — data only) and keeps it for every device paired with that Mac.
// Particles never take clicks, stop when the tab is hidden and aren't drawn for prefers-reduced-motion.
import { tunnel } from "./tunnel.js";

const KEY = "clo.theme", CKEY = "clo.customTheme";
const VARS = ["bg", "surface", "bubble", "border", "text", "muted", "accent", "code"];
const FONTS = { serif: "var(--serif)", rounded: 'ui-rounded, "SF Pro Rounded", "Nunito", "Be Vietnam Pro", sans-serif', mono: "var(--mono)" };
const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const rnd = (a, b) => a + Math.random() * (b - a);

// ---- particles -------------------------------------------------------------------------------------------------
let P = { kind: "none" }, parts = [], raf = 0, cv = null, ctx = null, t0 = performance.now();
const dark = () => root.dataset.dark === "1";
function defaults(kind) {
  const d = dark(), acc = getComputedStyle(root).getPropertyValue("--accent").trim() || "#D97757";
  return { snow: [d ? "#FFFFFF" : "#AABED7"], petals: ["#F4B6C2", "#F8D0D8", "#E89AAC"], leaves: ["#D9822B", "#B5541C", "#E0B04A"],
           stars: [d ? "#FFF6D8" : "#C9A24B"], bubbles: [acc], embers: ["#FF8A3D", "#FFB547"], confetti: [acc, "#F2C14E", "#4BA3C7", "#7BC67E"],
           glyphs: [d ? "#FFFFFF" : "#333333"] }[kind] || ["#FFFFFF"];
}
function part(top) {
  const k = P.kind, sp = P.speed || 1, cols = P.colors?.length ? P.colors : defaults(k), W = innerWidth, H = innerHeight;
  const p = { x: rnd(0, W), y: top ? -20 : rnd(0, H), r: rnd(0.8, 2.6), vy: rnd(0.35, 1.2) * sp, sway: rnd(0, 6.28), ss: rnd(0.004, 0.016),
              rot: rnd(0, 6.28), vr: rnd(-0.02, 0.02), a: rnd(0.35, 0.85), c: cols[Math.floor(Math.random() * cols.length)],
              g: P.glyphs?.length ? P.glyphs[Math.floor(Math.random() * P.glyphs.length)] : "✦" };
  if (k === "petals" || k === "leaves") { p.r = rnd(3, k === "leaves" ? 7 : 5); p.vy = rnd(0.3, 0.9) * sp; }
  if (k === "confetti") { p.r = rnd(3, 6); p.vy = rnd(0.6, 1.5) * sp; p.vr = rnd(-0.08, 0.08); }
  if (k === "glyphs") { p.r = rnd(9, 20); p.vy = rnd(0.3, 0.9) * sp; }
  if (k === "bubbles" || k === "embers") { p.y = top ? H + 20 : rnd(0, H); p.vy = -rnd(0.3, 1) * sp; p.r = k === "bubbles" ? rnd(3, 10) : rnd(0.8, 2.2); }
  if (k === "stars") { p.vy = 0; p.r = rnd(0.6, 2); p.tw = rnd(0.5, 2) * sp; }
  return p;
}
function draw(p, t) {
  const k = P.kind;
  ctx.globalAlpha = p.a; ctx.fillStyle = ctx.strokeStyle = p.c;
  if (k === "stars") { ctx.globalAlpha = p.a * (0.35 + 0.65 * Math.abs(Math.sin(t * p.tw + p.sway))); }
  if (k === "petals" || k === "leaves" || k === "confetti") {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath();
    if (k === "confetti") ctx.fillRect(-p.r / 2, -p.r, p.r, p.r * 2);
    else { ctx.ellipse(0, 0, p.r * (k === "leaves" ? 1.6 : 1.9), p.r, 0, 0, 6.29); ctx.fill(); }
    ctx.restore(); return;
  }
  if (k === "glyphs") { ctx.font = `${p.r}px system-ui`; ctx.fillText(p.g, p.x, p.y); return; }
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29);
  if (k === "bubbles") { ctx.lineWidth = 1; ctx.stroke(); }
  else { if (k === "embers") { ctx.shadowBlur = 8; ctx.shadowColor = p.c; } ctx.fill(); ctx.shadowBlur = 0; }
}
function frame() {
  const t = (performance.now() - t0) / 1000, W = innerWidth, H = innerHeight;
  ctx.clearRect(0, 0, W, H);
  for (const p of parts) {
    p.y += p.vy; p.sway += p.ss; p.x += Math.sin(p.sway) * (P.kind === "petals" || P.kind === "leaves" ? 0.9 : 0.4); p.rot += p.vr;
    if (p.vy > 0 && p.y > H + 20 || p.vy < 0 && p.y < -20) Object.assign(p, part(true));
    draw(p, t);
  }
  ctx.globalAlpha = 1;
  raf = requestAnimationFrame(frame);
}
function size() { if (!cv) return; const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
function particles(spec) {
  cancelAnimationFrame(raf); raf = 0;
  P = spec || { kind: "none" };
  if (P.kind === "none" || !P.kind || reduce.matches) { cv?.remove(); cv = null; return; }
  if (!cv) { cv = document.createElement("canvas"); cv.id = "snow"; cv.setAttribute("aria-hidden", "true"); document.body.append(cv); ctx = cv.getContext("2d"); size(); }
  const n = P.count ?? Math.min(140, Math.round(innerWidth * innerHeight / 12000));
  parts = Array.from({ length: n }, () => part(false));
  if (!document.hidden) frame();
}
addEventListener("resize", size);
document.addEventListener("visibilitychange", () => { if (cv) { cancelAnimationFrame(raf); raf = 0; if (!document.hidden) frame(); } });

// ---- custom theme: colors, font, background, css ---------------------------------------------------------------
function tile(pat, color) {
  const g = pat.gap || 64, c = document.createElement("canvas"), d = devicePixelRatio || 1;
  c.width = c.height = g * d; const x = c.getContext("2d"); x.scale(d, d);
  x.globalAlpha = pat.opacity ?? 0.08; x.fillStyle = color; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `${pat.size || 22}px system-ui, "Apple Color Emoji", sans-serif`;
  const gl = pat.glyphs || [];
  x.fillText(gl[0], g / 4, g / 4); x.fillText(gl[1] || gl[0], g * 3 / 4, g * 3 / 4);
  return `url(${c.toDataURL()})`;
}
function hexA(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a)).toFixed(2)})`;
}
function paintCustom(t) {
  const m = dark() ? t.dark : t.light;
  for (const k of VARS) root.style.setProperty(`--${k}`, m[k]);
  if (FONTS[t.font]) root.style.setProperty("--sans", FONTS[t.font]); else root.style.removeProperty("--sans");
  const b = t.background || {}, layers = [], sizes = [], reps = [];
  const add = (img, size = "auto", rep = "repeat") => { layers.push(img); sizes.push(size); reps.push(rep); };
  if (b.svg) add(`url("data:image/svg+xml;utf8,${encodeURIComponent(b.svg)}")`);
  if (b.pattern?.glyphs?.length) add(tile(b.pattern, m.text));
  if (b.art?.svg) {   // one full-screen picture (a flag, a scene): under a wash of the theme's bg so the chat reads
    const wash = hexA(m.bg, 1 - (b.art.opacity ?? 0.35));
    add(`linear-gradient(${wash}, ${wash})`, "100% 100%", "no-repeat");
    add(`url("data:image/svg+xml;utf8,${encodeURIComponent(b.art.svg)}")`, b.art.fit === "contain" ? "contain" : "cover", "no-repeat");
  }
  const gr = dark() ? b.gradientDark : b.gradient;
  if (gr?.length >= 2) add(`linear-gradient(${b.angle ?? 160}deg, ${gr.join(", ")})`, "100% 100%", "no-repeat");
  else if (b.art?.svg) add(`linear-gradient(${m.bg}, ${m.bg})`, "100% 100%", "no-repeat");
  document.body.style.backgroundImage = layers.join(", ");
  document.body.style.backgroundSize = sizes.join(", ");
  document.body.style.backgroundRepeat = reps.join(", ");
  document.body.style.backgroundPosition = layers.length ? layers.map(() => "center").join(", ") : "";
  document.body.style.backgroundAttachment = layers.length ? "fixed" : "";
  root.classList.toggle("has-bg", layers.length > 0);
  let st = document.getElementById("theme-css");
  if (t.css) { if (!st) { st = document.createElement("style"); st.id = "theme-css"; document.head.append(st); } st.textContent = t.css; }
  else st?.remove();
  document.querySelectorAll('meta[name="theme-color"]').forEach((x) => x.setAttribute("content", m.bg));
}
function clearCustom() {
  for (const k of [...VARS, "sans"]) root.style.removeProperty(`--${k}`);
  for (const k of ["backgroundImage", "backgroundAttachment", "backgroundSize", "backgroundRepeat", "backgroundPosition"]) document.body.style[k] = "";
  root.classList.remove("has-bg"); document.getElementById("theme-css")?.remove();
  const tc = document.querySelectorAll('meta[name="theme-color"]');
  tc[0]?.setAttribute("content", "#F5F4EE"); tc[1]?.setAttribute("content", "#262624");
}
function custom() { try { return JSON.parse(localStorage.getItem(CKEY) || "null"); } catch { return null; } }
function current() { return localStorage.getItem(KEY) || "default"; }

function apply() {
  const t = current(), c = t.startsWith("custom:") ? custom() : null;
  root.dataset.theme = c ? "custom" : t === "xmas" ? "xmas" : "default";
  if (c) { paintCustom(c); particles(c.particles); }
  else { clearCustom(); particles(t === "xmas" ? { kind: "snow" } : null); }
  const b = document.getElementById("theme-btn");
  if (b) { b.textContent = c ? c.icon || "🎨" : t === "xmas" ? "❄" : "🎨"; b.classList.toggle("on", t !== "default"); b.title = "Theme"; }
}
export function setTheme(t, theme) {
  if (theme) localStorage.setItem(CKEY, JSON.stringify(theme));
  localStorage.setItem(KEY, t === "xmas" || t.startsWith?.("custom:") ? t : "default");
  apply();
}

// ---- light / dark: "system" follows the OS, or the user's fixed choice. ◐ in the sidebar footer cycles. ----------
const MODES = { system: ["◐", "Giao diện: theo hệ thống"], light: ["☀", "Giao diện: sáng"], dark: ["☾", "Giao diện: tối"] };
const sysDark = matchMedia("(prefers-color-scheme: dark)");
function applyMode() {
  const m = localStorage.getItem("clo.mode") || "system";
  root.dataset.dark = m === "dark" || (m === "system" && sysDark.matches) ? "1" : "0";
  const b = document.getElementById("mode-btn");
  if (b) { const [icon, title] = MODES[m] || MODES.system; b.textContent = icon; b.title = title; }
  if (document.body) apply();   // custom colors / particle colors follow the mode
}
export function setMode(m) { localStorage.setItem("clo.mode", MODES[m] ? m : "system"); applyMode(); }
sysDark.addEventListener("change", applyMode);

// ---- the picker: built-in themes, the Mac's vibecoded ones, and "describe a theme" --------------------------------
let pop = null, list = [];
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
function render() {
  if (!pop) return;
  const cur = current(), rows = pop.querySelector(".theme-list");
  rows.replaceChildren();
  const row = (id, icon, name, onPick, onDel) => {
    const r = h("div", "theme-row" + (cur === id ? " on" : ""));
    const b = h("button", "theme-pick", `${icon}  ${name}`); b.onclick = onPick; r.append(b);
    if (onDel) { const x = h("button", "theme-del", "✕"); x.title = "Xoá theme"; x.onclick = onDel; r.append(x); }
    rows.append(r);
  };
  row("default", "🎨", "Mặc định", () => { setTheme("default"); render(); });
  row("xmas", "❄", "Let it snow", () => { setTheme("xmas"); render(); });
  const c = custom(), all = c && cur.startsWith("custom:") && !list.some((t) => `custom:${t.id}` === cur) ? [c, ...list] : list;
  for (const t of all) row(`custom:${t.id}`, t.icon || "🎨", t.name, () => { setTheme(`custom:${t.id}`, t); render(); }, async () => {
    if (!confirm(`Xoá theme ${t.name}?`)) return;
    try { list = (await tunnel.op("theme.delete", { id: t.id })).themes || []; } catch (e) { return say(e.message, true); }
    if (current() === `custom:${t.id}`) setTheme("default");
    render();
  });
  const edit = pop.querySelector(".theme-edit");
  edit.classList.toggle("hidden", !cur.startsWith("custom:"));
}
function say(msg, err) { const s = pop?.querySelector(".theme-status"); if (s) { s.textContent = msg || ""; s.classList.toggle("error", !!err); } }
async function load() {
  try { list = (await tunnel.op("theme.list", {}, 20_000)).themes || []; say(""); }
  catch (e) { say(e.message, true); }
  const c = custom(), cur = current();   // the active theme changed on another device (made "darker" there): take it
  if (c && cur.startsWith("custom:")) { const fresh = list.find((t) => `custom:${t.id}` === cur); if (fresh && fresh.updatedAt !== c.updatedAt) setTheme(cur, fresh); }
  render();
}
async function make() {
  const ta = pop.querySelector("textarea"), btn = pop.querySelector(".theme-make"), prompt = ta.value.trim();
  if (!prompt) return ta.focus();
  const editing = current().startsWith("custom:") && pop.querySelector(".theme-edit input").checked;
  btn.disabled = true; say("Claude đang thiết kế theme… (khoảng 15 giây)");
  try {
    const r = await tunnel.op("theme.make", { prompt, base: editing ? custom() : null, replace: editing }, 300_000);
    list = r.themes || list; setTheme(`custom:${r.theme.id}`, r.theme); ta.value = ""; ta.blur();
    say(`Đã lưu và dùng theme ${r.theme.name} — theme nằm trong danh sách trên, dùng lại được trên mọi thiết bị đã ghép.`);
    pop?.querySelector(".theme-done")?.classList.remove("hidden");
  } catch (e) { say(e.message, true); }
  btn.disabled = false; render();
}
function closePicker() { if (pop) { pop.remove(); pop = null; } }
function openPicker(anchor) {
  if (pop) return closePicker();
  pop = h("div", "theme-pop");
  const head = h("div", "theme-head"), x = h("button", "theme-close", "✕");
  x.title = "Đóng"; x.setAttribute("aria-label", "Đóng"); x.onclick = closePicker;
  head.append(h("div", "theme-title", "Theme"), x);
  pop.append(head, h("div", "theme-list"));
  pop.addEventListener("keydown", (e) => { if (e.key === "Escape") closePicker(); });
  const ta = h("textarea"); ta.rows = 3; ta.placeholder = "Mô tả theme bạn muốn… vd: Ottoman + Nhật Bản, hoa anh đào rơi";
  ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) make(); });
  const ed = h("label", "theme-edit hidden"); const cb = h("input"); cb.type = "checkbox"; ed.append(cb, h("span", null, "Sửa theme đang dùng"));
  const mk = h("button", "primary theme-make", "Tạo theme"); mk.onclick = make;
  const done = h("button", "theme-done hidden", "Xong"); done.onclick = () => { closePicker(); document.getElementById("sidebar")?.classList.remove("open"); };
  pop.append(ta, ed, mk, done, h("div", "theme-status muted small"), h("div", "theme-note muted small", "Claude Code trên Mac của bạn vẽ theme; theme lưu trên Mac và dùng được trên mọi thiết bị đã ghép."));
  anchor.parentElement.style.position = "relative";
  anchor.parentElement.append(pop);
  render(); load(); ta.focus();
  setTimeout(() => document.addEventListener("pointerdown", function off(e) {
    if (pop && !pop.contains(e.target) && e.target !== anchor) { pop.remove(); pop = null; document.removeEventListener("pointerdown", off); }
    else if (!pop) document.removeEventListener("pointerdown", off);
  }), 0);
}

export function initTheme() {
  applyMode();
  document.getElementById("mode-btn")?.addEventListener("click", () => {
    const order = ["system", "light", "dark"], cur = localStorage.getItem("clo.mode") || "system";
    setMode(order[(order.indexOf(cur) + 1) % order.length]);
  });
  apply();
  reduce.addEventListener("change", apply);
  const b = document.getElementById("theme-btn");
  b?.addEventListener("click", () => openPicker(b));
}
