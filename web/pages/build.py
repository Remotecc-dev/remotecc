"""Build the content pages: web/pages/<slug>.md (front matter: title, description) → web/public/<slug>.html for people
and search engines, and web/public/<slug>.md (the same text, for AI agents). Also writes sitemap.xml and llms.txt.
Run from anywhere: python3 web/pages/build.py (deploy.sh runs it). Standard library only."""
import html
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
PUB = HERE.parent / "public"
SITE = "https://remotecc.dev"
NAV = [("claude-code", "Claude Code"), ("codex", "Codex"), ("claude-code-remote-control", "Remote control"), ("claude-code-on-iphone", "On iPhone"),
       ("claude-code-from-browser", "In the browser"), ("claude-code-over-tailscale", "Over Tailscale"),
       ("how-it-works", "How it works"), ("security", "Security")]
EXTRA = ["/", "/install.md", "/windows", "/windows.md", "/vibe-guide", "/privacy", "/terms", "/support"]


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"`([^`]+)`", lambda m: "<code>" + m.group(1) + "</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>', s)
    return s


def md(text):
    """The Markdown these pages use: headings, paragraphs, lists (- / 1.), fenced code, tables, bold, code, links."""
    out, lines, i = [], text.split("\n"), 0
    while i < len(lines):
        ln = lines[i]
        if ln.strip().startswith("```"):
            ind = len(ln) - len(ln.lstrip())
            lang = ln.strip()[3:]
            i += 1
            code = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code.append(lines[i][ind:])
                i += 1
            out.append(f'<pre><code class="{html.escape(lang)}">' + html.escape("\n".join(code)) + "</code></pre>")
            i += 1
            continue
        if m := re.match(r"^(#{1,3}) (.+)", ln):
            n = len(m.group(1))
            out.append(f"<h{n}>{inline(m.group(2))}</h{n}>")
        elif ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                if not re.fullmatch(r"\|[\s|:-]+\|", lines[i].strip()):
                    rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            t = "<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in rows[0]) + "</tr></thead><tbody>"
            t += "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows[1:])
            out.append(t + "</tbody></table>")
            continue
        elif re.match(r"^(- |\d+\. )", ln):
            tag = "ol" if ln[0].isdigit() else "ul"
            items = []
            while i < len(lines) and (re.match(r"^(- |\d+\. )", lines[i]) or (lines[i].startswith("  ") and items)):
                if re.match(r"^(- |\d+\. )", lines[i]):
                    items.append([re.sub(r"^(- |\d+\. )", "", lines[i])])
                else:
                    items[-1].append(lines[i][3:] if lines[i].startswith("   ") else lines[i][2:])
                i += 1
            lis = []
            for it in items:
                k = 1   # wrapped text lines belong to the item's first line; a code block (or more) follows
                while k < len(it) and it[k].strip() and not it[k].lstrip().startswith("```"):
                    k += 1
                first, rest = " ".join(x.strip() for x in it[:k]), "\n".join(it[k:])
                lis.append("<li>" + inline(first) + (md(rest) if rest.strip() else "") + "</li>")
            out.append(f"<{tag}>" + "".join(lis) + f"</{tag}>")
            continue
        elif ln.strip():
            para = [ln]
            while i + 1 < len(lines) and lines[i + 1].strip() and not re.match(r"^(#|- |\d+\. |\||```)", lines[i + 1]):
                i += 1
                para.append(lines[i])
            out.append("<p>" + inline(" ".join(p.strip() for p in para)) + "</p>")
        i += 1
    return "\n".join(out)


STYLE = """:root{color-scheme:light dark;--bg:#F5F4EE;--card:#fff;--text:#1f1e1d;--muted:#6b6a64;--accent:#c96442;--line:#e6e4dc;--code:#efede6}
@media(prefers-color-scheme:dark){:root{--bg:#262624;--card:#30302e;--text:#f0eee6;--muted:#a3a198;--line:#3a3936;--code:#1f1e1d}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:17px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:760px;margin:0 auto;padding:20px}header{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;margin-bottom:12px}
.home{display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:inherit;font-weight:600}.home img{border-radius:8px}
nav{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:14px}nav a{color:var(--muted);text-decoration:none}nav a:hover,nav a[aria-current]{color:var(--accent)}
h1{font:600 34px/1.2 "Source Serif 4",Georgia,serif;margin:18px 0 10px}h2{font-size:21px;margin:30px 0 8px}a{color:var(--accent)}
code{background:var(--code);padding:1px 5px;border-radius:5px;font-size:.9em}pre{background:var(--code);padding:12px 14px;border-radius:10px;overflow-x:auto}pre code{padding:0}
table{border-collapse:collapse;width:100%;font-size:15px;display:block;overflow-x:auto}th,td{border:1px solid var(--line);padding:6px 9px;text-align:left;vertical-align:top}
.cta{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:34px 0 10px}.cta pre{margin:8px 0}
.btn{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;padding:8px 16px;border-radius:10px;font-weight:600}
footer{color:var(--muted);font-size:14px;margin:26px 0 30px}footer a{color:var(--muted)}"""


def page(slug, meta, body):
    title, desc = meta["title"], meta["description"]
    nav = "".join(f'<a href="/{s}"{" aria-current=page" if s == slug else ""}>{t}</a>' for s, t in NAV)
    ld = {"@context": "https://schema.org", "@type": "TechArticle", "headline": title, "description": desc,
          "url": f"{SITE}/{slug}", "inLanguage": "en", "publisher": {"@type": "Organization", "name": "RemoteCC", "url": SITE},
          "about": {"@type": "SoftwareApplication", "name": "RemoteCC", "url": SITE, "applicationCategory": "DeveloperApplication",
                    "operatingSystem": "macOS, Linux, Windows (WSL2)", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}}}
    e = html.escape
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title><meta name="description" content="{e(desc)}"><link rel="canonical" href="{SITE}/{slug}">
<link rel="alternate" type="text/markdown" href="/{slug}.md">
<meta property="og:type" content="article"><meta property="og:site_name" content="RemoteCC"><meta property="og:url" content="{SITE}/{slug}">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:image" content="{SITE}/icon-512.png">
<meta name="twitter:card" content="summary"><link rel="icon" href="/logo.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">{json.dumps(ld)}</script><style>{STYLE}</style></head><body><div class="wrap">
<header><a class="home" href="/"><img src="/logo.svg" width="30" height="30" alt="">RemoteCC</a><nav>{nav}</nav></header>
<main>{body}
<section class="cta"><b>Try RemoteCC — free and open source.</b> On the computer that runs Claude Code:
<pre><code>curl -fsSL https://remotecc.dev/install.sh | bash</code></pre>
<a class="btn" href="/">Open the web app</a> &nbsp; <a href="https://github.com/Remotecc-dev/remotecc">Source on GitHub</a> · <a href="/install.md">Install guide</a> · <a href="/windows">Windows</a></section></main>
<footer>RemoteCC is open source (Apache-2.0) and not affiliated with Anthropic. Claude and Claude Code are trademarks of Anthropic.
· <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/support">Support</a> · <a href="/{slug}.md">Markdown</a></footer>
</div><script src="/beacon.js" defer></script></body></html>
"""


def main():
    built = []
    for slug, _ in NAV:
        src = (HERE / f"{slug}.md").read_text()
        m = re.match(r"^---\n(.*?)\n---\n", src, re.S)
        meta = dict(l.split(": ", 1) for l in m.group(1).splitlines())
        text = src[m.end():].lstrip()
        (PUB / f"{slug}.html").write_text(page(slug, meta, md(text)))
        (PUB / f"{slug}.md").write_text(text.rstrip() + f"\n\n---\nRemoteCC · {SITE}/{slug} · open source: https://github.com/Remotecc-dev/remotecc\n")
        built.append((slug, meta))
    urls = EXTRA + [f"/{s}" for s, _ in built]
    (PUB / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                     + "".join(f"  <url><loc>{SITE}{u}</loc></url>\n" for u in urls) + "</urlset>\n")
    (PUB / "llms.txt").write_text(f"""# RemoteCC

> RemoteCC is a free, open-source (Apache-2.0) interface for Claude Code: a small bridge runs next to the Claude Code CLI
> on your own computer (macOS, Linux, Windows via WSL2), and a web app at {SITE} — or served locally by the bridge at
> http://127.0.0.1:7791 — lets you start, watch and answer Claude Code sessions from any browser or phone. End-to-end
> encrypted (X25519 + AES-256-GCM), blind relay, no account, signed releases. It also shows Claude plan usage left,
> tokens and cost per session, and the computer's RAM, CPU temperature and disk.

Install on the computer that runs Claude Code: `curl -fsSL {SITE}/install.sh | bash`, then open {SITE} there (it pairs
by itself) or run `remotecc pair` and scan the QR code from a phone.

## Docs for agents
- [Install guide]({SITE}/install.md): steps an AI agent (e.g. Claude Code) can follow to install and pair RemoteCC
- [Windows (WSL2) guide]({SITE}/windows.md): install on Windows through WSL2
""" + "".join(f"- [{meta['title'].split(' — ')[0]}]({SITE}/{s}.md): {meta['description']}\n" for s, meta in built) + f"""
## Project
- [Source code](https://github.com/Remotecc-dev/remotecc): bridge, web app, relay, installer (Apache-2.0)
- [Privacy]({SITE}/privacy): what is stored where, aggregate cookieless visit counting
- Contact: support@remotecc.dev
""")
    print("built", len(built), "pages + sitemap.xml + llms.txt")


if __name__ == "__main__":
    main()
