// Vibecoding logic shared by the web UI and its tests (node --test web/test). Mirrors the iOS app's VibeText/VibeCamera.

export const MODES = { off: "Tắt vibecoding", gestures: "Cử chỉ + giọng nói (camera)", voice: "Chỉ giọng nói (không camera)" };

// "Dừng lại!" → "dung lai"
export function fold(s) {
  return s.replace(/[đĐ]/g, "d").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const STOP = ["dung", "dung lai", "dung lai di", "ngat", "ngat di", "stop", "thoi dung lai", "huy", "huy di"];
const OFF = ["tat vibe", "tat vibecoding", "tat vai", "tat che do", "tat nghe", "thoat vibe", "tat ranh tay"];
const MUTE = ["im", "im di", "im lang", "dung doc", "ngung doc", "thoi doc"];
const REPEAT = ["doc lai", "noi lai", "nhac lai"];

// What a spoken sentence means: short control phrases are commands, anything else is sent as typed.
export function command(spoken) {
  const text = (spoken || "").trim();
  if (!text) return { kind: "ignore" };
  const key = fold(text);
  if (key.split(" ").length <= 4) {
    if (STOP.includes(key)) return { kind: "stop" };
    if (OFF.includes(key)) return { kind: "off" };
    if (MUTE.includes(key)) return { kind: "mute" };
    if (REPEAT.includes(key)) return { kind: "repeat" };
  }
  return { kind: "send", text };
}

const clean = (line) => line
  .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
  .replace(/^(#{1,6}|>|[-*•]|\d+\.)\s+/, "")
  .replace(/[*_`~]/g, "").trim();

function sentences(text) {
  const out = text.match(/[^.!?…]+(?:[.!?…]+|$)/g)?.map((s) => s.trim()).filter(Boolean);
  return out?.length ? out : [text];
}

// Does this reply end by asking the user something (a question, or numbered options)? Nods / shakes / fingers only
// count then — otherwise a head bob while reading would send "Đồng ý" out of nowhere.
export function isAsking(reply) {
  const tail = (reply || "").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("🔧") && !l.startsWith("```")).slice(-12);
  if (tail.some((l) => clean(l).endsWith("?"))) return true;
  return tail.filter((l) => /^(\*\*)?\d[.)]\s/.test(l)).length >= 2;
}

// Spoken summary of a reply: its opening sentences (the answer comes first) + a closing question, if any.
export function summary(reply, limit = 260) {
  const prose = [];
  let inCode = false;
  for (const raw of (reply || "").split("\n")) {
    const line = raw.trim();
    if (line.startsWith("```")) { inCode = !inCode; continue; }
    if (inCode || line.startsWith("|") || line.startsWith("🔧") || line.startsWith("⚙︎")) continue;
    prose.push(clean(line));
  }
  const paragraphs = prose.join("\n").split(/\n\s*\n/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
  if (!paragraphs.length) return "";
  let out = "";
  for (const s of sentences(paragraphs[0])) {
    if (!out) { out = s; continue; }
    if (out.length + s.length + 1 > limit) break;
    out += " " + s;
    if (out.length > limit / 2) break;
  }
  if (out.length > limit) out = out.slice(0, limit).split(" ").slice(0, -1).join(" ") + "…";
  if (paragraphs.length > 1) {
    const q = sentences(paragraphs[paragraphs.length - 1]).pop();
    if (q?.endsWith("?") && !out.includes(q)) out += " " + q;
  }
  return out;
}

// Range of a signal and how often it changed direction; a reversal counts once it moved back by minStep (or 30 %).
export function swing(xs, minStep) {
  if (!xs.length) return { range: 0, turns: 0 };
  const lo = Math.min(...xs), hi = Math.max(...xs), range = hi - lo, step = Math.max(range * 0.3, minStep);
  let turns = 0, dir = 0, ext = xs[0];
  for (const x of xs) {
    if (dir === 0) { if (Math.abs(x - ext) > step) { dir = x > ext ? 1 : -1; ext = x; } }
    else if (dir === 1) { if (x > ext) ext = x; else if (ext - x > step) { turns++; dir = -1; ext = x; } }
    else { if (x < ext) ext = x; else if (x - ext > step) { turns++; dir = 1; ext = x; } }
  }
  return { range, turns };
}

const avg = (...ps) => ({ x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length });

// MediaPipe face mesh → head pose in eye-distances: only turning the head moves the nose against the eyes,
// so a moving laptop/phone, leaning in or reading don't count. `aspect` = video width / height.
export function headSample(lm, aspect = 1) {
  const P = (i) => ({ x: lm[i].x * aspect, y: lm[i].y });
  const le = avg(P(33), P(133)), re = avg(P(362), P(263)), eyes = avg(le, re), nose = P(1);
  const span = Math.max(Math.hypot(le.x - re.x, le.y - re.y), 0.001);
  return { h: (nose.x - eyes.x) / span, v: (nose.y - eyes.y) / span };
}

// MediaPipe hand (21 points) → "thumb" (like, left hand only), "palm" (4 straight fingers), "1"–"3" (raised fingers,
// thumb included — "3" is often thumb + index + middle) or "". `left` = it's the user's left hand.
export function handKind(lm, aspect = 1, left = true) {
  const P = (i) => ({ x: lm[i].x * aspect, y: lm[i].y });
  const w = P(0), d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // Like: the thumb tip is clearly the highest point of the hand (y grows downward). Curled fingers seen side-on can
  // look "straight" to the finger count, so this doesn't depend on it.
  const size = Math.max(d(w, P(9)), 0.01), tip = P(4);
  const others = [8, 12, 16, 20, 6, 10, 9].map((i) => P(i).y);
  const like = tip.y < Math.min(...others) - 0.25 * size && (w.y - tip.y) / size > 0.7;
  if (like) return left ? "thumb" : "1";   // a like is the hand's top point, so no other finger is raised
  // Measured from each finger's own knuckle too, so a close hand (wrist off-screen, guessed) still counts right.
  const n = [[8, 6, 5], [12, 10, 9], [16, 14, 13], [20, 18, 17]]
    .filter(([t, pip, m]) => d(P(t), P(m)) > d(P(pip), P(m)) * 1.5 || d(P(t), w) > d(P(pip), w) * 1.2).length;
  // The thumb counts when it sticks out away from the index knuckle (folded across the palm it stays close).
  const thumb = like || (d(tip, P(5)) > 0.75 * size && d(tip, w) > d(P(3), w) * 1.1);
  const total = n + (thumb ? 1 : 0);
  // 5 (thumb out) = open palm; 4 long fingers with the thumb tucked = "4" (talk).
  return total >= 5 ? "palm" : total >= 1 ? String(total) : "";
}

// Frame-by-frame gesture state machine (same rules and thresholds as the app).
export class GestureTracker {
  constructor(sensitivity = 1) { this.sensitivity = sensitivity; this.reset(); }
  reset() { this.head = []; this.tips = []; this.pose = { kind: "", since: 0 }; this.cooldownUntil = 0; this.handSince = 0; }
  // t in seconds; head {h,v} or null; hand {kind, tipX} or null → intent string or null
  // ("yes" | "no" | "choose:N" | "stop" | "talk" | "off")
  update(t, head, hand) {
    const s = this.sensitivity;
    if (head) this.head.push({ t, ...head });
    this.head = this.head.filter((p) => t - p.t <= 1.4);
    const nodNeed = 0.16 / s, shakeNeed = 0.22 / s;   // shakes were firing from glances
    const v = swing(this.head.map((p) => p.v), nodNeed * 0.6), h = swing(this.head.map((p) => p.h), shakeNeed * 0.6);
    this.debug = `gật ${v.range.toFixed(2)}/${nodNeed.toFixed(2)}×${v.turns} · lắc ${h.range.toFixed(2)}/${shakeNeed.toFixed(2)}×${h.turns}`;
    if (t < this.cooldownUntil) return null;
    if (this.head.length >= 8) {
      if (v.range > nodNeed && v.turns >= 2 && h.range < v.range * 0.5) return this.fire("yes", t);
      if (h.range > shakeNeed && h.turns >= 2 && v.range < h.range * 0.5) return this.fire("no", t);
    }
    if (!hand) { this.tips = []; this.pose = { kind: "", since: t }; return null; }
    if (!this.tips.length && !this.pose.kind) this.handSince = t;
    this.tips.push({ t, x: hand.tipX });
    this.tips = this.tips.filter((p) => t - p.t <= 1.5);
    if (hand.kind !== this.pose.kind) this.pose = { kind: hand.kind, since: t };
    // Wave: an open-ish hand (3+ fingers — motion blur makes the count flicker) swinging side to side twice, not
    // counting the first 0.4 s (raising the hand into view). A still palm is "stop", never a wave.
    const last = this.tips.filter((p) => t - p.t < 0.5).map((p) => p.x);
    const moving = Math.max(...last) - Math.min(...last) > 0.06;
    const sway = swing(this.tips.filter((p) => p.t >= this.handSince + 0.4).map((p) => p.x), 0.06 / s);
    void moving, sway;   // waving is unassigned for now
    const held = t - this.pose.since;
    if (hand.kind === "thumb" && held > 1) return this.fire("off", t);   // a like needn't be perfectly still
    const recent = this.tips.filter((p) => t - p.t < 0.8).map((p) => p.x);
    if (Math.max(...recent) - Math.min(...recent) >= 0.05) return null;
    if (hand.kind === "thumb" && held > 1.2) return this.fire("off", t);
    // An open palm (5) does nothing: too easy to confuse with 4 (talk). Stop by voice ("dừng lại") or the button.
    if (hand.kind === "4" && held > 0.9) return this.fire("talk", t);
    if (["1", "2", "3"].includes(hand.kind) && held > 0.9) return this.fire("choose:" + hand.kind, t);
    return null;
  }
  fire(intent, t) { this.cooldownUntil = t + 1.8; this.head = []; this.tips = []; this.pose = { kind: "", since: t }; return intent; }
}

export const INTENTS = {
  yes: { label: "Gật đầu → Đồng ý", message: "Yes, go ahead." },
  no: { label: "Lắc đầu → Không", message: "No, don't do that — suggest another way." },
  stop: { label: "Xoè tay → Dừng lượt đang chạy" },
  talk: { label: "4 ngón → Nói" },
  off: { label: "Like tay trái → Tắt vibecoding" },
};
export function intentInfo(intent) {
  if (intent.startsWith("choose:")) { const n = intent.slice(7); return { label: `${n} ngón → Chọn phương án ${n}`, message: `Go with option ${n}.` }; }
  return INTENTS[intent];
}
