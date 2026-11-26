"""The web app served from this computer (http://127.0.0.1:<local_web>): release files web-<name> (or the checkout's
web/public), only for 127.0.0.1/localhost, other pages sent to the site; its origin may ask for the local pairing link;
an update that only changes web-* files doesn't restart the bridge."""
import http.client, pathlib, shutil, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import pairpage, updater

fails = 0
def check(name, ok, info=""):
    global fails
    print(("PASS " if ok else "FAIL ") + name, "" if ok else info)
    fails += not ok

def get(port, path, host=None, origin=None):
    c = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
    h = {"Host": host or f"127.0.0.1:{port}"}
    if origin: h["Origin"] = origin
    c.request("GET", path, headers=h)
    r = c.getresponse()
    return r.status, dict(r.getheaders()), r.read()

# release layout: web-* next to the bridge
rel = pathlib.Path("/tmp/remotecc-localweb/app"); shutil.rmtree(rel.parent, ignore_errors=True); rel.mkdir(parents=True)
(rel / "web-index.html").write_text("<h1>RemoteCC local</h1>")
(rel / "web-app.js").write_text("console.log(1)")
(rel / "tunnel.py").write_text("# not web")
pairpage.serve_web(rel, 7471, log=lambda *a: None)
s, h, b = get(7471, "/")
check("/ → web-index.html", s == 200 and b"RemoteCC local" in b and h["Content-Type"].startswith("text/html"), (s, b))
s, h, b = get(7471, "/app.js?v=2")
check("/app.js → web-app.js as JavaScript", s == 200 and h["Content-Type"].startswith("text/javascript"), (s, h))
s, h, b = get(7471, "/tunnel.py")
check("bridge code isn't served", s == 302, s)
s, h, b = get(7471, "/../tunnel.py")
check("no path tricks", s in (302, 404) and b"not web" not in b, (s, b))
s, h, b = get(7471, "/privacy")
check("site-only pages → remotecc.dev", s == 302 and h.get("Location") == "https://remotecc.dev/privacy", (s, h))
s, h, b = get(7471, "/", host="evil.example")
check("other Host (DNS rebinding) refused", s == 403, s)

# git checkout: ../web/public
src = pathlib.Path(__file__).resolve().parent.parent
pairpage.serve_web(src, 7472, log=lambda *a: None)
s, h, b = get(7472, "/")
check("checkout serves web/public/index.html", s == 200 and b"RemoteCC" in b, s)
s, h, b = get(7472, "/i18n.js")
check("checkout serves web/public/i18n.js", s == 200 and h["Content-Type"].startswith("text/javascript"), s)

# control page: the local web origin may read the pairing link, others may not
class T:
    pairing = {"exp": 9e12}
    label = "Test"
    def qr(self): return "remotecc://pair?d=abc"
    def start_pairing(self): pass
    def state(self): return {}
pairpage.serve(T(), 7473, log=lambda *a: None, local_web=7471)
s, h, b = get(7473, "/api/localpair", origin="http://127.0.0.1:7471")
check("local web origin gets the pairing link", s == 200 and h.get("Access-Control-Allow-Origin") == "http://127.0.0.1:7471", (s, h))
s, h, b = get(7473, "/api/localpair", origin="http://127.0.0.1:9999")
check("other local origin refused", s == 403, s)
s, h, b = get(7473, "/api/state")
check("state says where the local web app is", b'"localWeb": "http://127.0.0.1:7471"' in b, b)

check("web-only change", updater.web_only({"a.py": "1", "web-app.js": "1"}, {"a.py": "1", "web-app.js": "2"}))
check("bridge change isn't web-only", not updater.web_only({"a.py": "1", "web-app.js": "1"}, {"a.py": "2", "web-app.js": "2"}))
check("new web file is web-only", updater.web_only({"a.py": "1"}, {"a.py": "1", "web-x.css": "1"}))
check("no change isn't web-only", not updater.web_only({"a.py": "1"}, {"a.py": "1"}))
print("ALL PASS" if not fails else f"{fails} FAILED")
sys.exit(1 if fails else 0)
