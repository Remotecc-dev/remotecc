import fs from "fs";
const src = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const code = src.slice(src.indexOf("function btwThreads()"), src.indexOf("function btwPlace"));
const store = {}; globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
const writes = [];
const S = { uid: "u", branchRuns: [] };
const f = new Function("S", "tsDate", "renderMessages", "updateDoc", "doc", "db",
  code + "; return { btwRestore, btwThreads, btwDismiss, btwMarkSeen };");
const mk = () => f(S, (t) => t, () => {}, async (p, d) => writes.push([p, d]), (_, p) => p, null);
let api = mk();
const docs = [
  { id: "a", fork: true, btw: true, btwQ: "Q1", thread: "a", reply: "A1", createdAt: 1, sessionId: "s" },
  { id: "a2", fork: true, btw: true, btwQ: "Q2", thread: "a", reply: "", createdAt: 3 },
  { id: "x", fork: true, text: "/compact", createdAt: 2 },
  { id: "m", text: "main", createdAt: 2 } ];
api.btwRestore(docs);
const t = api.btwThreads(); let ok = 0, n = 0;
const ck = (c, m) => { n++; if (c) ok++; else console.log("FAIL", m); };
ck(t.length === 1 && t[0].length === 2 && t[0][0].command === "Q1", "restore thread");
api.btwMarkSeen(S.branchRuns[0]);
docs[1].reply = "A2"; api.btwRestore(docs);
ck(S.branchRuns.length === 2 && S.branchRuns.find((r) => r.id === "a2").reply === "A2", "update in place");
api.btwDismiss(api.btwThreads()[0][0]);
ck(writes[0][0] === "clo/u/terminalInbox/a" && writes[0][1].btwHidden, "dismiss written");
// leave the session (resetView) and come back on a fresh load
S.branchRuns = []; api = mk();
api.btwRestore(docs.map((d) => d.id === "a" ? { ...d, btwHidden: true } : d));
ck(S.branchRuns.find((r) => r.id === "a").dismissed, "dismiss survives");
ck(S.branchRuns.find((r) => r.id === "a").seen && !S.branchRuns.find((r) => r.id === "a2").seen, "seen survives");
console.log(`${ok}/${n}`);
