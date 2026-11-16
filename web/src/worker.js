// remotecc-web: static files + aggregate, cookieless visit counting. Adds security headers; /install.sh is served as plain text.
// No CSP on purpose: artifacts (Claude-made HTML with inline scripts + any CDN) render in sandboxed srcdoc iframes, which
// inherit the page's policy. Markdown is sanitised with DOMPurify; artifact frames get no same-origin access.
//
// Counting (see /privacy): each page/installer/release request and each beacon from the page becomes one data point in
// Workers Analytics Engine — path, referrer host, utm_source, country, kind of client. No cookies, no IP, no user id.
// The page's beacon carries a random id that lives only in that tab (for "how long was it used"), never stored by it.
const STATIC = /\.(js|css|png|svg|ico|jpg|webp|woff2?|json|txt|xml|map)$/;
const AI_BOTS = /GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|Google-Extended|CCBot|Bytespider|Amazonbot|Applebot-Extended|meta-externalagent|DuckAssistBot|MistralAI-User/i;
const SEARCH_BOTS = /Googlebot|bingbot|Applebot|DuckDuckBot|YandexBot|Baiduspider|Slurp|SeznamBot|facebookexternalhit|Twitterbot|LinkedInBot|Discordbot|Slackbot|TelegramBot|WhatsApp/i;

export function client(ua) {
  ua = ua || "";
  const ai = ua.match(AI_BOTS);
  if (ai) return "ai:" + ai[0];
  const se = ua.match(SEARCH_BOTS);
  if (se) return "bot:" + se[0];
  if (/^curl\//i.test(ua)) return "curl";
  if (/remotecc-(bridge|updater|installer|deploy)/i.test(ua)) return ua.match(/remotecc-[a-z]+/i)[0].toLowerCase();
  if (/Python-urllib|python-requests|aiohttp|node-fetch|undici|axios|Go-http-client|wget/i.test(ua)) return "agent";
  if (/bot|crawl|spider|slurp|fetch/i.test(ua)) return "bot:other";
  if (/iPhone|iPad|Android|Mobile/i.test(ua)) return "mobile";
  return "desktop";
}

const host = (u) => { try { return u ? new URL(u).hostname.replace(/^www\./, "") : ""; } catch { return ""; } };
const cut = (s, n = 96) => String(s || "").slice(0, n);

function record(env, req, kind, f = {}) {
  if (!env.AE) return;
  try {
    const url = new URL(req.url);
    env.AE.writeDataPoint({
      indexes: [kind],
      blobs: [kind, cut(f.path ?? url.pathname), cut(f.ref ?? host(req.headers.get("Referer"))),
              cut(f.utm ?? url.searchParams.get("utm_source") ?? url.searchParams.get("ref") ?? ""),
              client(req.headers.get("User-Agent")), cut(req.cf?.country || "", 4), cut(f.target || "", 160), cut(f.sid || "", 24)],
      doubles: [f.value ?? 1],
    });
  } catch {}
}

// Outbound links the page sends through /go/<name> (counted, then redirected). Fixed list: never an open redirect.
const GO = {
  appstore: "https://apps.apple.com/app/id6797019430?ct=remotecc-web&mt=8",
  github: "https://github.com/Remotecc-dev/remotecc",
  claudecode: "https://docs.anthropic.com/en/docs/claude-code/overview",
  tailscale: "https://tailscale.com/download",
};

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), path = url.pathname;

    // beacon from the page: {e: "view"|"ping"|"click"|"app", sid, path, ref, utm, target}
    if (path === "/t" && req.method === "POST") {
      let b = {};
      try { b = JSON.parse((await req.text()).slice(0, 2000)); } catch {}
      const e = ["view", "ping", "click", "app"].includes(b.e) ? b.e : null;
      if (e) record(env, req, "web:" + e, { path: b.path, ref: host(b.ref) || cut(b.ref, 40), utm: b.utm, target: b.target,
                                             sid: /^[A-Za-z0-9]{6,24}$/.test(b.sid || "") ? b.sid : "" });
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }
    if (path.startsWith("/go/")) {
      const name = path.slice(4).replace(/\/$/, ""), to = GO[name];
      if (!to) return Response.redirect(url.origin + "/", 302);
      record(env, req, "go", { target: name, utm: url.searchParams.get("from") || "" });
      return new Response(null, { status: 302, headers: { Location: to, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    }

    // Cloudflare's asset "html handling" 307s /x.html → /x; the bridge updater wants the release file itself, unredirected
    // (webapp-*.html screens for the iOS app and the local web app's web-*.html are part of the signed release)
    const res = path.startsWith("/bridge/") && path.endsWith(".html")
      ? await env.ASSETS.fetch(new Request(new URL(path.slice(0, -5), url), req))
      : await env.ASSETS.fetch(req);
    const out = new Response(res.body, res);
    if (path === "/install.sh" || path.startsWith("/bridge/")) out.headers.set("Content-Type", "text/plain; charset=utf-8");
    if (path.endsWith(".md") || path === "/llms.txt") out.headers.set("Content-Type", (path.endsWith(".md") ? "text/markdown" : "text/plain") + "; charset=utf-8");
    out.headers.set("Referrer-Policy", "no-referrer");
    out.headers.set("X-Content-Type-Options", "nosniff");
    out.headers.set("X-Frame-Options", "DENY");

    if (req.method === "GET" && res.status < 400) {
      if (path === "/bridge/MANIFEST.json") record(env, req, url.searchParams.get("src") === "install" ? "install" : "update-check");
      else if (path === "/install.sh") record(env, req, "install-script");
      else if (path === "/install.md" || path === "/windows.md") record(env, req, "install-doc");
      else if (path.startsWith("/bridge/")) {}
      else if (path === "/robots.txt" || path === "/sitemap.xml" || path === "/llms.txt" || path.endsWith(".md")) record(env, req, "doc");
      else if (!STATIC.test(path)) {
        // a page: humans are counted by the page's own beacon (it knows the tab is visible); count bots/agents here
        const c = client(req.headers.get("User-Agent"));
        if (c !== "desktop" && c !== "mobile") record(env, req, "page");
      }
    }
    return out;
  },
};
