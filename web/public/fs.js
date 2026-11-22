// The slice of the Firebase Firestore SDK that app.js uses, answered by the paired Mac's local store through the tunnel.
// Live listeners refresh right away on bridge "changed" notices, with a fallback poll (paused while the tab is hidden);
// a document poll sends ?ifNoneMatch=<updateTime> so an unchanged transcript costs nothing.
import { tunnel } from "./tunnel.js";

export class Timestamp {
  constructor(ms) { this.ms = ms; }
  static now() { return new Timestamp(Date.now()); }
  static fromMillis(ms) { return new Timestamp(ms); }
  static fromDate(d) { return new Timestamp(d.getTime()); }
  toDate() { return new Date(this.ms); }
  toMillis() { return this.ms; }
  get seconds() { return Math.floor(this.ms / 1000); }
  valueOf() { return this.ms; }
}

export class Bytes {
  constructor(b64) { this.b64 = b64; }
  static fromBase64String(s) { return new Bytes(s); }
  toBase64() { return this.b64; }
  toUint8Array() { return Uint8Array.from(atob(this.b64), (c) => c.charCodeAt(0)); }   // agent images (app.js agentImage)
}

export const getFirestore = () => ({});
export const collection = (_db, path) => ({ type: "collection", path, id: path.split("/").pop() });
export const doc = (_db, path) => ({ type: "doc", path, id: path.split("/").pop() });
export const where = (field, op, value) => ({ field, op, value });
export const query = (coll, ...filters) => ({ type: "query", path: coll.path, coll: coll.id, filters });

// ------------------------------------------------------------ value encoding (Firestore REST)
export function encodeValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Timestamp) return { timestampValue: new Date(v.ms).toISOString() };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (v instanceof Bytes) return { bytesValue: v.b64 };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (typeof v === "object") return { mapValue: { fields: encodeFields(v) } };
  return { stringValue: String(v) };
}
export const encodeFields = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, encodeValue(v)]));

export function decodeValue(x) {
  const [k, v] = Object.entries(x || { nullValue: null })[0];
  switch (k) {
    case "integerValue": return Number(v);
    case "doubleValue": return Number(v);
    case "booleanValue": return !!v;
    case "nullValue": return null;
    case "timestampValue": return new Timestamp(Date.parse(v));
    case "bytesValue": return new Bytes(v);
    case "arrayValue": return (v.values || []).map(decodeValue);
    case "mapValue": return decodeFields(v.fields || {});
    default: return v;
  }
}
export const decodeFields = (f) => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, decodeValue(v)]));

const snapDoc = (d, path) => {
  const id = (d?.name || path).split("/").pop();
  const data = d ? decodeFields(d.fields) : undefined;
  return { id, ref: { type: "doc", path: (d?.name || path).split("/documents/").pop(), id }, exists: () => !!d, data: () => data, updateTime: d?.updateTime };
};

// ------------------------------------------------------------ reads
async function store(method, url, body) {
  const r = await tunnel.request(method, url, body);
  if (r.status >= 400 && r.status !== 404) throw new Error(r.body?.error?.status || r.body?.error || `Mac báo lỗi ${r.status}`);
  return r;
}

export async function getDoc(ref) {
  const r = await store("GET", ref.path);
  return snapDoc(r.status === 200 ? r.body : null, ref.path);
}

const OPS = { "==": "EQUAL", "!=": "NOT_EQUAL", ">": "GREATER_THAN", ">=": "GREATER_THAN_OR_EQUAL", "<": "LESS_THAN", "<=": "LESS_THAN_OR_EQUAL",
              in: "IN", "not-in": "NOT_IN", "array-contains": "ARRAY_CONTAINS", "array-contains-any": "ARRAY_CONTAINS_ANY" };

export async function getDocs(q) {
  if (q.type === "collection") {
    const r = await store("GET", `${q.path}?pageSize=1000`);
    const docs = (r.body.documents || []).map((d) => snapDoc(d));
    return { docs, empty: !docs.length, size: docs.length, forEach: (f) => docs.forEach(f) };
  }
  const parent = q.path.split("/").slice(0, -1).join("/");
  const filters = q.filters.map((f) => ({ fieldFilter: { field: { fieldPath: f.field }, op: OPS[f.op], value: encodeValue(f.value) } }));
  const where = filters.length === 1 ? filters[0] : filters.length ? { compositeFilter: { op: "AND", filters } } : undefined;
  const r = await store("POST", `${parent}:runQuery`, { structuredQuery: { from: [{ collectionId: q.coll }], ...(where ? { where } : {}) } });
  const docs = (r.body || []).filter((x) => x.document).map((x) => snapDoc(x.document));
  return { docs, empty: !docs.length, size: docs.length, forEach: (f) => docs.forEach(f) };
}

// ------------------------------------------------------------ writes
export async function setDoc(ref, data, opts = {}) {
  const keys = opts.merge ? Object.keys(data) : null;
  const qs = keys ? "?" + keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&") : "";
  await store("PATCH", ref.path + qs, { fields: encodeFields(data) });
}
export const updateDoc = (ref, data) => setDoc(ref, data, { merge: true });
export const deleteDoc = (ref) => store("DELETE", ref.path);

export function writeBatch() {
  const ops = [];
  return {
    set(ref, data, opts) { ops.push(() => setDoc(ref, data, opts)); return this; },
    update(ref, data) { ops.push(() => updateDoc(ref, data)); return this; },
    delete(ref) { ops.push(() => deleteDoc(ref)); return this; },
    async commit() { for (const op of ops) await op(); },
  };
}

// ------------------------------------------------------------ live listeners (change notices + fallback poll)
const FAST = /\/(terminalSessions|terminalInbox|terminalBranches)(\/|$)/;   // the open session and its queue
const PUSHED = /\/(terminalSessions|terminalInbox)(\/|$)/;   // the bridge sends "changed" for these (PUSH_COLLS)
const NOTICE_FRESH = 60_000;
const MIN_GAP = 300;

export function onSnapshot(ref, cb, onError) {
  let stopped = false, timer = 0, last = null, stamp = "", busy = false, rerun = false, startedAt = 0;
  const fast = FAST.test(ref.path);
  const coll = ref.coll || ref.id;
  const pushed = PUSHED.test(ref.path);
  // Notices live (one in the last minute) → a slow safety poll for what they cover; otherwise the old 1.5 s.
  const pollMs = () => !fast ? 10_000 : (pushed && Date.now() - tunnel.lastNotice < NOTICE_FRESH) ? 10_000 : 1500;
  const matches = (paths) => Array.isArray(paths) && paths.some((p) => typeof p === "string" && (
    ref.type === "doc" ? (ref.path === p || ref.path.endsWith("/" + p)) : p.split("/")[0] === coll
  ));
  const tick = async () => {
    if (stopped) return;
    if (busy) { rerun = true; return; }
    if (document.hidden || !tunnel.macOnline) { timer = setTimeout(tick, 1500); return; }
    busy = true; startedAt = Date.now();
    try {
      if (ref.type === "doc") {
        const r = await store("GET", `${ref.path}${stamp ? "?ifNoneMatch=" + encodeURIComponent(stamp) : ""}`);
        if (r.status !== 304) {
          const d = r.status === 200 ? r.body : null;
          stamp = d?.updateTime || "";
          const key = stamp || "missing";
          if (key !== last) { last = key; cb(snapDoc(d, ref.path)); }
        }
      } else {
        const s = await getDocs(ref);
        const key = JSON.stringify(s.docs.map((d) => [d.id, d.updateTime]));
        if (key !== last) {
          const before = new Map((tick.prev || []).map((d) => [d.id, d.updateTime]));
          const now = new Set(s.docs.map((d) => d.id));
          const changes = s.docs.filter((d) => before.get(d.id) !== d.updateTime).map((d) => ({ type: before.has(d.id) ? "modified" : "added", doc: d }));
          for (const d of tick.prev || []) if (!now.has(d.id)) changes.push({ type: "removed", doc: d });
          tick.prev = s.docs;
          last = key;
          cb({ ...s, docChanges: () => changes });
        }
      }
    } catch (e) { onError?.(e); }
    finally { busy = false; }
    if (stopped) return;
    if (rerun) { rerun = false; timer = setTimeout(tick, gap()); }
    else timer = setTimeout(tick, pollMs());
  };
  // At most one notice-driven fetch per MIN_GAP: a burst of writes (or a relay replaying an old notice) can't turn into a
  // request storm. A notice while the tab is hidden still shortens the wait, so coming back shows the change within 1.5 s.
  const gap = () => Math.max(0, startedAt + MIN_GAP - Date.now());
  const onChanged = (e) => {
    if (stopped || !matches(e.detail)) return;
    if (busy) { rerun = true; return; }
    clearTimeout(timer);
    timer = setTimeout(tick, gap());
  };
  tunnel.addEventListener("changed", onChanged);
  tick();
  return () => { stopped = true; clearTimeout(timer); tunnel.removeEventListener("changed", onChanged); };
}
