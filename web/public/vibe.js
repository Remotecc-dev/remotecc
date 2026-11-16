// Vibecoding on the web: MacBook camera gestures (MediaPipe, in the browser) + hands-free speech (Web Speech API —
// Safari uses Apple's dictation engine) + spoken summaries (speechSynthesis, the Mac's own vi-VN voice). Nothing
// leaves the browser except recognised speech (Apple/Google, as with dictation).
import { MODES, command, summary, headSample, handKind, GestureTracker, intentInfo, isAsking } from "./vibe-core.js";

const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL = "https://storage.googleapis.com/mediapipe-models";

export function createVibe({ bar, button, menu, isBusy, lastReply = () => "", getInput = () => "", setInput, send, stop, suggestions }) {
  let mode = localStorage.getItem("clo.vibe.mode") || "off";
  let speak = localStorage.getItem("clo.vibe.read") === "1";  // read-aloud summaries: off by default
  let sensitivity = Number(localStorage.getItem("clo.vibe.sensitivity") || 1);
  let delay = Number(localStorage.getItem("clo.vibe.delay2") || 6);   // seconds between a gesture and sending it
  let stream = null, video = null, face = null, hands = null, raf = 0, tracker = new GestureTracker(sensitivity);
  let rec = null, recording = false, transcript = "", silence = 0, failures = 0, speaking = false, lastSummary = "";
  let pending = null, pendingTimer = 0, note = "", noteTimer = 0, faceSeen = false, handText = "", debug = "";

  // ------------------------------------------------------------ UI
  bar.innerHTML = `
    <div class="vibe-pending hidden"><span class="vibe-ring"></span><div><b></b><div class="muted small"></div></div><button class="link">Huỷ</button></div>
    <div class="vibe-row">
      <div class="vibe-lead"><video playsinline muted></video><span class="vibe-wave">${waveIcon()}</span></div>
      <div class="vibe-status"><div class="vibe-main"></div><div class="vibe-sub muted small"></div></div>
      <button class="icon vibe-mute hidden" title="Ngừng đọc">${speakerOffIcon()}</button>
      <button class="icon vibe-gear" title="Cài đặt vibecoding">${gearIcon()}</button>
      <button class="icon vibe-close" title="Thoát vibecoding">${closeIcon()}</button>
      <button class="send vibe-mic" title="Nói">${micIcon()}</button>
    </div>`;
  const q = (s) => bar.querySelector(s);
  video = q("video");
  q(".vibe-pending .link").onclick = () => cancelPending();
  q(".vibe-mic").onclick = () => toggleTalk();
  q(".vibe-mute").onclick = () => quiet();
  q(".vibe-close").onclick = () => setMode("off");

  // One click = on/off (gestures + voice by default); options live behind the gear on the bar (or right-click).
  const preferred = () => localStorage.getItem("clo.vibe.preferred") || "gestures";
  button.onclick = (e) => { e.stopPropagation(); menu.classList.add("hidden"); setMode(mode === "off" ? preferred() : "off"); };
  button.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); renderMenu(); menu.classList.remove("hidden"); };
  q(".vibe-gear").onclick = (e) => { e.stopPropagation(); renderMenu(); menu.classList.toggle("hidden"); };
  document.addEventListener("click", (e) => { if (!menu.contains(e.target)) menu.classList.add("hidden"); });

  function renderMenu() {
    menu.replaceChildren();
    const item = (label, on, fn) => {
      const b = document.createElement("button");
      b.className = "vibe-item" + (on ? " on" : "");
      b.innerHTML = `<span class="tick">${on ? "✓" : ""}</span>${label}`;
      b.onclick = (e) => { e.stopPropagation(); fn(); renderMenu(); };
      menu.append(b);
    };
    menu.append(Object.assign(document.createElement("div"), { className: "vibe-head", textContent: "Nút bàn tay bật" }));
    for (const m of ["gestures", "voice"]) item(MODES[m].replace(/ \(.*\)$/, ""), preferred() === m, () => {
      localStorage.setItem("clo.vibe.preferred", m);
      if (mode !== "off") setMode(m);
    });
    menu.append(Object.assign(document.createElement("hr")));
    item("Đọc tóm tắt câu trả lời", speak, () => { speak = !speak; localStorage.setItem("clo.vibe.read", speak ? "1" : "0"); if (!speak) quiet(); });
    if (mode === "gestures" || preferred() === "gestures") for (const [v, l] of [[0.7, "Độ nhạy thấp"], [1, "Độ nhạy vừa"], [1.4, "Độ nhạy cao"]])
      item(l, sensitivity === v, () => { sensitivity = v; tracker.sensitivity = v; localStorage.setItem("clo.vibe.sensitivity", v); });
    if (mode === "gestures" || preferred() === "gestures") for (const v of [1.6, 3, 6])
      item(`Chờ ${String(v).replace(".", ",")} giây trước khi gửi`, delay === v, () => { delay = v; localStorage.setItem("clo.vibe.delay2", v); });
    if (mode === "gestures" || preferred() === "gestures")
      item("Hiện số đo cử chỉ", localStorage.getItem("clo.vibe.debug") === "1", () => localStorage.setItem("clo.vibe.debug", localStorage.getItem("clo.vibe.debug") === "1" ? "0" : "1"));
    menu.append(Object.assign(document.createElement("hr")));
    const guide = document.createElement("a");
    guide.className = "vibe-item"; guide.href = "/vibe-guide.html"; guide.target = "_blank"; guide.innerHTML = `<span class="tick"></span>Hướng dẫn vibecoding ↗`;
    menu.append(guide);
  }

  function render() {
    button.classList.toggle("on", mode !== "off");
    bar.classList.toggle("hidden", mode === "off");
    if (mode === "off") return;
    bar.classList.toggle("gestures", mode === "gestures");
    q(".vibe-lead").classList.toggle("seen", faceSeen);
    q(".vibe-lead").classList.toggle("live", recording);
    q(".vibe-mute").classList.toggle("hidden", !speaking);
    q(".vibe-mic").innerHTML = recording ? sendIcon() : micIcon();
    q(".vibe-mic").title = recording ? "Gửi ngay" : "Nói";
    const busy = isBusy();
    let main, sub = "";
    if (recording) {
      main = transcript || "Đang nghe… nói đi";
      sub = mode === "voice" ? "Ngừng ~2 giây là gửi · “tắt vibe” hoặc ✕ để thoát" : "Ngừng ~2 giây là gửi · giơ 4 ngón để gửi ngay";
    } else if (speaking) main = "Đang đọc tóm tắt…";
    else if (mode === "voice") main = note || (failures >= 3 ? "Micro không bật được — bấm mic để thử lại" : "Chế độ giọng nói · nói “tắt vibe” hoặc bấm ✕ để thoát");
    else {
      main = note || (busy ? "Claude đang chạy · 4 ngón = nói thêm · nói “dừng lại” = dừng"
                           : isAsking(lastReply()) ? "Claude đang hỏi · gật 2 lần = đồng ý · lắc = không · 1–3 ngón = chọn"
                           : "Chưa có câu hỏi · 4 ngón = nói · 1–3 ngón = chọn gợi ý · like tay trái = tắt");
      sub = [handText, debug].filter(Boolean).join(" · ");
    }
    q(".vibe-main").textContent = main;
    q(".vibe-main").classList.toggle("live", recording);
    q(".vibe-sub").textContent = sub;
  }

  function flash(t) { note = t; render(); clearTimeout(noteTimer); noteTimer = setTimeout(() => { note = ""; render(); }, 2000); }

  // ------------------------------------------------------------ modes
  async function setMode(m) {
    mode = m; localStorage.setItem("clo.vibe.mode", m);
    cancelPending(); failures = 0;
    if (m === "gestures") await startCamera(); else stopCamera();
    if (m === "off") { stopTalk(); quiet(); }
    render();
    listenHandsFree();
  }

  // ------------------------------------------------------------ camera + MediaPipe
  async function startCamera() {
    if (stream) return;
    try {
      flash("Đang bật camera…");
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      video.srcObject = stream; await video.play();
      if (!face) {
        const { FilesetResolver, FaceLandmarker, HandLandmarker } = await import(`${MP}/vision_bundle.mjs`);
        const files = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
        const opts = (path) => ({ baseOptions: { modelAssetPath: `${MODEL}/${path}`, delegate: "GPU" }, runningMode: "VIDEO" });
        [face, hands] = await Promise.all([
          FaceLandmarker.createFromOptions(files, { ...opts("face_landmarker/face_landmarker/float16/1/face_landmarker.task"), numFaces: 1 }),
          HandLandmarker.createFromOptions(files, { ...opts("hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"), numHands: 1 }),
        ]);
      }
      tracker.reset(); note = ""; loop();
    } catch (e) { flash("Không bật được camera: " + e.message); stopCamera(); }
  }

  function stopCamera() {
    cancelAnimationFrame(raf); raf = 0;
    stream?.getTracks().forEach((t) => t.stop()); stream = null;
    if (video) video.srcObject = null;
    faceSeen = false; handText = ""; debug = "";
  }

  let lastFrame = 0;
  function loop() {
    if (!stream) return;
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    if (now - lastFrame < 1000 / 15 || video.readyState < 2) return;  // 15 fps is plenty and spares the battery
    lastFrame = now;
    const aspect = video.videoWidth / video.videoHeight || 4 / 3;
    const f = face.detectForVideo(video, now).faceLandmarks?.[0];
    // Only a raised hand counts: hands on the keyboard sit at the bottom of the frame and must never count.
    const res = hands.detectForVideo(video, now), raw = res.landmarks?.[0];
    // Which hand: by where it is next to the face (webcam frames aren't mirrored, so the user's left hand is on the
    // picture's right). MediaPipe's own label is only the fallback.
    const left = raw && f ? raw[0].x > f[1].x
      : (res.handedness?.[0]?.[0]?.categoryName ?? res.handednesses?.[0]?.[0]?.categoryName) === "Right";
    // A raised hand: its highest point sits in the upper part of the frame (the wrist may be off-screen when the
    // hand is close); hands on a keyboard stay at the bottom.
    const h = raw && Math.min(...raw.map((p) => p.y)) < 0.6 ? raw : null;
    const head = f ? headSample(f, aspect) : null;
    const kind = h ? handKind(h, aspect, left) : "";
    const intent = tracker.update(now / 1000, head, h ? { kind, tipX: (h[12] ?? h[8]).x } : null);
    const seen = !!f, ht = h ? (left ? "tay trái · " : "tay phải · ") + ({ palm: "xoè tay", thumb: "ngón cái giơ lên" }[kind] ?? (kind ? `${kind} ngón` : "")) : "";
    if (seen !== faceSeen || ht !== handText || localStorage.getItem("clo.vibe.debug") === "1") {
      faceSeen = seen; handText = ht; debug = localStorage.getItem("clo.vibe.debug") === "1" ? tracker.debug : ""; render();
    }
    if (intent) handle(intent);
  }

  function handle(intent) {
    if (intent === "off") return setMode("off");
    // Typing (hands in front of the camera): a gesture would overwrite or send the half-written text.
    if (!recording && getInput().trim()) return;
    if (recording) { if (intent === "talk") finishTalk(); return; }
    if (pending) { if (intent !== pending) { cancelPending(); flash("Đã huỷ"); } return; }
    if (intent === "talk") return toggleTalk();
    const busy = isBusy();
    if (intent === "stop") return busy ? arm(intent) : flash("Không có gì đang chạy để dừng");
    if (busy) return flash("Claude đang chạy — chờ xong rồi trả lời");
    // Fingers pick a numbered next-step suggestion when there is one.
    const sug = suggestions?.() || [], pick = intent.startsWith("choose:") ? sug[+intent.slice(7) - 1] : null;
    if (pick) return arm(intent, pick);
    if (!isAsking(lastReply())) return;   // nothing was asked: ignore silently (reading / talking head bobs)
    return arm(intent);
  }

  function arm(intent, text) {
    pending = intent;
    const info = text ? { label: `${intent.slice(7)} ngón → Gợi ý ${intent.slice(7)}`, message: text } : intentInfo(intent), box = q(".vibe-pending");
    box.querySelector("b").textContent = info.label;
    box.querySelector(".small").textContent = info.message ? `Gửi: “${info.message}”` : "Lắc đầu hoặc bấm Huỷ để bỏ";
    box.classList.remove("hidden");
    box.querySelector(".vibe-ring").style.animation = "none"; void box.offsetWidth; box.querySelector(".vibe-ring").style.animation = ""; box.querySelector(".vibe-ring").style.animationDuration = delay + "s";
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      const p = pending; cancelPending();
      if (p === "stop") stop();
      else { setInput(text ?? intentInfo(p).message); send(); }
    }, delay * 1000);
  }
  function cancelPending() { pending = null; clearTimeout(pendingTimer); q(".vibe-pending").classList.add("hidden"); }

  // ------------------------------------------------------------ speech
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  function startTalk() {
    if (!SR) { flash("Trình duyệt này không có nhận giọng nói — dùng Safari hoặc Chrome"); failures = 3; return; }
    if (recording) return;
    quiet();
    rec = new SR();
    rec.lang = "vi-VN"; rec.continuous = true; rec.interimResults = true;
    transcript = "";
    rec.onresult = (e) => {
      transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ").replace(/\s+/g, " ").trim();
      setInput(transcript); armSilence(); render();
    };
    rec.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") failures = 3; };
    rec.onend = () => { const was = recording; recording = false; rec = null; render(); if (was) { if (transcript) finishTalk(true); else listenHandsFree(); } };
    try { rec.start(); recording = true; failures = 0; armSilence(); } catch { failures++; }
    render();
  }
  function stopTalk() { const r = rec; recording = false; rec = null; clearTimeout(silence); try { r?.abort(); } catch {} render(); }
  // A pause ends the message (~2 s); nothing said for a while → recycle the session.
  function armSilence() { clearTimeout(silence); silence = setTimeout(() => finishTalk(), transcript ? 1800 : mode === "voice" ? 50_000 : 8000); }

  function toggleTalk() { if (recording) return finishTalk(); cancelPending(); failures = 0; startTalk(); }

  function finishTalk(ended = false) {
    const text = transcript; transcript = "";
    if (!ended) stopTalk(); else clearTimeout(silence);
    const c = command(text);
    if (c.kind !== "send") setInput("");
    if (c.kind === "stop") { if (isBusy()) { stop(); flash("Đã dừng lượt đang chạy"); } else flash("Không có gì đang chạy để dừng"); }
    else if (c.kind === "off") setMode("off");
    else if (c.kind === "mute") quiet();
    else if (c.kind === "repeat") { if (lastSummary) say(lastSummary); }
    else if (c.kind === "send") { setInput(c.text); send(); }
    listenHandsFree();
  }

  function listenHandsFree() {
    if (mode !== "voice" || failures >= 3) return;
    setTimeout(() => { if (mode === "voice" && !recording && !speaking) startTalk(); }, 400);
  }

  // ------------------------------------------------------------ spoken summaries
  function say(text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "vi-VN";  // always Vietnamese, even for code-heavy summaries
    u.voice = speechSynthesis.getVoices().find((v) => v.lang.replace("_", "-").toLowerCase().startsWith("vi")) || null;
    u.onend = u.onerror = () => { speaking = false; render(); listenHandsFree(); };
    speaking = true; render();
    speechSynthesis.speak(u);
  }
  function quiet() { if ("speechSynthesis" in window) speechSynthesis.cancel(); if (speaking) { speaking = false; render(); } }

  function onReply(text) {
    if (!speak || mode === "off") return;
    const s = summary(text);
    if (!s) return;
    lastSummary = s;
    if (recording) { if (transcript) return; stopTalk(); }  // don't talk over the user; close an idle mic first
    say(s);
  }

  render();
  if (mode !== "off") setMode(mode);
  return { setMode, onReply, render, get mode() { return mode; } };
}

const ic = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const handIcon = () => ic('<path d="M18 11V6a2 2 0 0 0-4 0v1"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>');
const micIcon = () => ic('<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>');
const sendIcon = () => ic('<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>');
const waveIcon = () => ic('<path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/>');
const speakerOffIcon = () => ic('<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>');
const closeIcon = () => ic('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>');
const gearIcon = () => ic('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>');
