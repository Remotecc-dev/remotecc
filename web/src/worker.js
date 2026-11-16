// remotecc-web: static files only (no API, no data). Adds security headers; /install.sh is served as plain text.
// No CSP on purpose: artifacts (Claude-made HTML with inline scripts + any CDN) render in sandboxed srcdoc iframes, which
// inherit the page's policy. Markdown is sanitised with DOMPurify; artifact frames get no same-origin access.
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    // Cloudflare's asset "html handling" 307s /x.html → /x; the bridge updater wants the release file itself, unredirected
    // (webapp-*.html screens for the iOS app are part of the signed release)
    const res = url.pathname.startsWith("/bridge/") && url.pathname.endsWith(".html")
      ? await env.ASSETS.fetch(new Request(new URL(url.pathname.slice(0, -5), url), req))
      : await env.ASSETS.fetch(req);
    const out = new Response(res.body, res);
    if (url.pathname === "/install.sh" || url.pathname.startsWith("/bridge/")) out.headers.set("Content-Type", "text/plain; charset=utf-8");
    if (url.pathname.endsWith(".md")) out.headers.set("Content-Type", "text/markdown; charset=utf-8");
    out.headers.set("Referrer-Policy", "no-referrer");
    out.headers.set("X-Content-Type-Options", "nosniff");
    out.headers.set("X-Frame-Options", "DENY");
    return out;
  },
};
