// node --test web/test
import test from "node:test";
import assert from "node:assert/strict";
import { command, summary, fold, swing, headSample, handKind, GestureTracker, intentInfo, isAsking } from "../public/vibe-core.js";

test("voice commands", () => {
  for (const [said, kind] of [["Dừng lại!", "stop"], ["dừng", "stop"], ["Ngắt đi.", "stop"], ["Stop", "stop"], ["Tắt vibe", "off"],
    ["Im lặng", "mute"], ["ngừng đọc", "mute"], ["Đọc lại", "repeat"], ["  ", "ignore"]]) assert.equal(command(said).kind, kind, said);
  assert.deepEqual(command("Dừng lại ở bước build rồi giải thích cho tôi"), { kind: "send", text: "Dừng lại ở bước build rồi giải thích cho tôi" });
  assert.equal(fold("Đừng ĐỌC nữa!"), "dung doc nua");
});

test("summary", () => {
  const reply = "**Đã sửa xong** lỗi nút dừng, có trong build 92. Mình chưa thử trên máy thật. Phần còn lại không đổi gì cả và mình sẽ viết thêm vài câu dài cho đủ độ dài để kiểm tra giới hạn ký tự.\n\n```swift\nlet x = 1\n```\n\n| A | B |\n|---|---|\n\nBạn có muốn đánh dấu stable không?";
  const s = summary(reply);
  assert.ok(s.startsWith("Đã sửa xong lỗi nút dừng"), s);
  assert.ok(!s.includes("let x") && !s.includes("|"), s);
  assert.ok(s.endsWith("Bạn có muốn đánh dấu stable không?"), s);
  assert.equal(summary(""), "");
  assert.equal(summary("- [Link](http://x) một ý"), "Link một ý");
});

test("isAsking", () => {
  assert.ok(isAsking("Xong rồi.\n\nBạn muốn mình deploy không?"));
  assert.ok(isAsking("Chọn một:\n1. Làm A\n2. Làm B"));
  assert.ok(!isAsking("Đã sửa xong, có trong build 16."));
  assert.ok(!isAsking(""));
});

test("swing", () => {
  const wave = (n, amp) => Array.from({ length: n }, (_, i) => amp * Math.sin((i / n) * 4 * Math.PI));
  assert.ok(swing(wave(20, 0.15), 0.1).turns >= 2);
  assert.equal(swing(Array.from({ length: 20 }, () => Math.random() * 0.04 - 0.02), 0.1).turns, 0);
  assert.equal(swing(Array.from({ length: 20 }, (_, i) => i * 0.02), 0.1).turns, 0);
});

// Synthetic face mesh: eyes fixed, nose offset by (dx, dy) eye-distances; `shift` moves the whole face.
function face(dx, dy, shift = 0) {
  const lm = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  const set = (i, x, y) => (lm[i] = { x: x + shift, y: y + shift });
  set(33, 0.38, 0.4); set(133, 0.46, 0.4); set(362, 0.54, 0.4); set(263, 0.62, 0.4);
  set(1, 0.5 + dx * 0.16, 0.5 + dy * 0.16);
  return lm;
}

test("headSample is translation invariant", () => {
  const a = headSample(face(0.1, 0.2)), b = headSample(face(0.1, 0.2, 0.2));
  assert.ok(Math.abs(a.h - b.h) < 1e-9 && Math.abs(a.v - b.v) < 1e-9);
});

function run(frames) {  // frames: [{head?, hand?}] at 15 fps
  const g = new GestureTracker(1); const out = [];
  frames.forEach((f, i) => { const r = g.update(i / 15, f.head ?? null, f.hand ?? null); if (r) out.push(r); });
  return out;
}

test("double nod → yes; shake → no", () => {
  const nod = Array.from({ length: 20 }, (_, i) => ({ head: headSample(face(0, 0.6 + 0.15 * Math.sin((i / 20) * 4 * Math.PI))) }));
  assert.deepEqual(run(nod), ["yes"]);
  const shake = Array.from({ length: 20 }, (_, i) => ({ head: headSample(face(0.15 * Math.sin((i / 20) * 4 * Math.PI), 0.6)) }));
  assert.deepEqual(run(shake), ["no"]);
});

test("a glance sideways isn't a shake", () => {
  const glance = Array.from({ length: 20 }, (_, i) => ({ head: headSample(face(0.09 * Math.sin((i / 20) * 4 * Math.PI), 0.6)) }));
  assert.deepEqual(run(glance), []);
});

test("moving the whole face (shaky laptop / reading) isn't a nod", () => {
  const bob = Array.from({ length: 30 }, (_, i) => ({ head: headSample(face(0, 0.6, 0.1 * Math.sin((i / 30) * 6 * Math.PI))) }));
  assert.deepEqual(run(bob), []);
  const small = Array.from({ length: 30 }, (_, i) => ({ head: headSample(face(0, 0.6 + 0.03 * Math.sin((i / 30) * 6 * Math.PI))) }));
  assert.deepEqual(run(small), []);
});

// Synthetic hand: wrist at bottom, `n` straight fingers.
function hand(n) {
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.8 }));
  [[8, 6], [12, 10], [16, 14], [20, 18]].forEach(([tip, pip], k) => {
    lm[pip] = { x: 0.44 + k * 0.04, y: 0.6 };
    lm[tip] = k < n ? { x: 0.44 + k * 0.04, y: 0.45 } : { x: 0.44 + k * 0.04, y: 0.68 };
  });
  return lm;
}

// Thumbs up: fingers curled, thumb tip high above the wrist.
function thumbsUp() {
  const lm = hand(0);
  lm[2] = { x: 0.42, y: 0.7 }; lm[3] = { x: 0.41, y: 0.58 }; lm[4] = { x: 0.4, y: 0.46 };
  return lm;
}

test("hand shapes and held gestures", () => {
  assert.equal(handKind(hand(4)), "4"); { const p = hand(4); p[3] = { x: 0.3, y: 0.68 }; p[4] = { x: 0.22, y: 0.6 }; assert.equal(handKind(p), "palm"); } assert.equal(handKind(hand(2)), "2"); assert.equal(handKind(hand(0)), ""); assert.equal(handKind(thumbsUp()), "thumb");
  const three = hand(2); three[3] = { x: 0.3, y: 0.68 }; three[4] = { x: 0.22, y: 0.6 };   // thumb out + index + middle
  assert.equal(handKind(three), "3");
  assert.equal(handKind(thumbsUp(), 1, false), "1");   // right-hand thumbs up is just one finger
  const held = (kind, secs) => Array.from({ length: Math.round(secs * 15) }, () => ({ hand: { kind, tipX: 0.5 } }));
  assert.deepEqual(run(held("2", 1.2)), ["choose:2"]);
  assert.deepEqual(run(held("palm", 1.5)), []);   // open palm is unassigned
  assert.deepEqual(run(held("thumb", 1.5)), ["off"]);
  assert.deepEqual(run(held("thumb", 0.8)), []);
  const wave = Array.from({ length: 22 }, (_, i) => ({ hand: { kind: "palm", tipX: 0.5 + 0.15 * Math.sin((i / 22) * 6 * Math.PI) } }));
  assert.deepEqual(run(wave), []);   // waving is unassigned for now
  // Raising the hand (fingertips sweep in while still curled/partly open), a wobble, then an open palm held still → stop, never talk.
  const raise = [
    ...Array.from({ length: 6 }, (_, i) => ({ hand: { kind: "2", tipX: 0.2 + i * 0.06 } })),
    ...Array.from({ length: 6 }, (_, i) => ({ hand: { kind: "palm", tipX: 0.5 + (i % 2 ? 0.03 : -0.03) } })),
    ...Array.from({ length: 25 }, () => ({ hand: { kind: "palm", tipX: 0.5 } })),
  ];
  assert.deepEqual(run(raise), []);
  // Waving with motion blur: the count flickers palm/3 — still a wave.
  const blurry = Array.from({ length: 24 }, (_, i) => ({ hand: { kind: i % 3 ? "palm" : "3", tipX: 0.5 + 0.1 * Math.sin((i / 24) * 6 * Math.PI) } }));
  assert.ok(!run(blurry).includes("talk"));
  // A small, slow side-to-side drift of an open palm isn't a wave either.
  const drift = Array.from({ length: 30 }, (_, i) => ({ hand: { kind: "palm", tipX: 0.5 + 0.06 * Math.sin((i / 30) * 4 * Math.PI) } }));
  assert.ok(!run(drift).includes("talk"));
  assert.equal(intentInfo("choose:3").message, "Go with option 3.");
});
