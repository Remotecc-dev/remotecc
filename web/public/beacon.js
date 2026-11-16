// Aggregate, cookieless visit counting for remotecc.dev (see /privacy): one "view" per page load, a "ping" each minute the
// tab is visible (→ time in use), a "click" for links that leave the page. The id is random per tab and never stored.
// Nothing is sent from any other host — the local web app (127.0.0.1) and self-hosted copies count nothing.
(function () {
  if (location.hostname !== "remotecc.dev" || navigator.doNotTrack === "1" || navigator.globalPrivacyControl) {
    window.rccBeacon = window.rccPath = function () {};
    return;
  }
  var sid = Array.from(crypto.getRandomValues(new Uint8Array(9)), function (b) { return "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]; }).join("");
  var q = new URLSearchParams(location.search), utm = q.get("utm_source") || q.get("ref") || "";
  var cur = location.pathname;
  function send(e, f) {
    var b = Object.assign({ e: e, sid: sid, path: cur }, f || {});
    var s = JSON.stringify(b);
    try { if (!navigator.sendBeacon || !navigator.sendBeacon("/t", s)) fetch("/t", { method: "POST", body: s, keepalive: true }); } catch (x) {}
  }
  window.rccBeacon = send;
  window.rccPath = function (p) { cur = p; };   // the web app: "/app" once paired, so its minutes count apart from the pairing page
  send("view", { ref: document.referrer && new URL(document.referrer).hostname !== location.hostname ? document.referrer : "", utm: utm });
  var t0 = Date.now();
  setInterval(function () {
    if (document.visibilityState === "visible" && Date.now() - t0 < 12 * 3600e3) send("ping");
  }, 60000);
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[href]");
    if (!a) return;
    var u; try { u = new URL(a.getAttribute("href"), location.href); } catch (x) { return; }
    if (u.pathname.indexOf("/go/") === 0) return;   // counted by the redirect itself
    if (u.hostname !== location.hostname) send("click", { target: u.hostname + u.pathname.slice(0, 80) });
    else if (/\.(md|sh)$/.test(u.pathname)) send("click", { target: u.pathname });
  }, true);
})();
