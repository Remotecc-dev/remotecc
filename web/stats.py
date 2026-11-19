"""remotecc.dev visit numbers from Workers Analytics Engine (dataset remotecc_web, written by src/worker.js).

  CF_ACCOUNT_ID=… CF_API_TOKEN=… python3 web/stats.py [days=7] [--json]

The token needs "Account Analytics: Read". Only aggregates exist: no cookies, no IPs, no user ids (see /privacy).
Columns: index1/blob1 kind · blob2 path · blob3 referrer host · blob4 utm_source · blob5 client · blob6 country ·
blob7 target (clicks, /go/) · blob8 random per-tab id (beacon) · double1 1."""
import json
import os
import sys
import urllib.error
import urllib.request

DAYS = next((int(a) for a in sys.argv[1:] if a.isdigit()), 7)


def sql(q):
    req = urllib.request.Request(f"https://api.cloudflare.com/client/v4/accounts/{os.environ['CF_ACCOUNT_ID']}/analytics_engine/sql",
                                 data=q.encode(), headers={"Authorization": "Bearer " + os.environ["CF_API_TOKEN"]})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())["data"]
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Analytics Engine SQL error {e.code}: {e.read().decode()[:300]}\n{q}")


W = f"timestamp > NOW() - INTERVAL '{DAYS}' DAY"
Q = {
    "totals": f"""SELECT blob1 AS kind, SUM(_sample_interval) AS n, COUNT(DISTINCT blob8) AS tabs
                  FROM remotecc_web WHERE {W} GROUP BY kind ORDER BY n DESC""",
    "sources": f"""SELECT blob3 AS referrer, blob4 AS utm, SUM(_sample_interval) AS views
                   FROM remotecc_web WHERE {W} AND blob1 = 'web:view' GROUP BY referrer, utm ORDER BY views DESC LIMIT 15""",
    "pages": f"""SELECT blob2 AS path, SUM(_sample_interval) AS views FROM remotecc_web WHERE {W} AND blob1 = 'web:view'
                 GROUP BY path ORDER BY views DESC LIMIT 15""",
    "minutes": f"""SELECT blob2 AS path, SUM(_sample_interval) AS minutes, COUNT(DISTINCT blob8) AS tabs FROM remotecc_web
                   WHERE {W} AND blob1 = 'web:ping' GROUP BY path ORDER BY minutes DESC LIMIT 10""",
    "clicks": f"""SELECT blob1 AS kind, blob7 AS target, SUM(_sample_interval) AS n FROM remotecc_web
                  WHERE {W} AND blob1 IN ('web:click', 'go') GROUP BY kind, target ORDER BY n DESC LIMIT 15""",
    "bots": f"""SELECT blob5 AS client, SUM(_sample_interval) AS n FROM remotecc_web
                WHERE {W} AND (startsWith(blob5, 'ai:') OR startsWith(blob5, 'bot:')) GROUP BY client ORDER BY n DESC LIMIT 15""",
    "countries": f"""SELECT blob6 AS country, SUM(_sample_interval) AS views FROM remotecc_web WHERE {W} AND blob1 = 'web:view'
                     GROUP BY country ORDER BY views DESC LIMIT 10""",
    # who fetched the installer: curl/wget = a real `curl … | bash` run; desktop/mobile = someone opened the file in a browser
    "installers": f"""SELECT blob1 AS kind, blob5 AS client, SUM(_sample_interval) AS n FROM remotecc_web
                      WHERE {W} AND blob1 IN ('install-script', 'install') GROUP BY kind, client ORDER BY n DESC""",
    "clients": f"""SELECT blob5 AS client, SUM(_sample_interval) AS views FROM remotecc_web WHERE {W} AND blob1 = 'web:view'
                   GROUP BY client ORDER BY views DESC LIMIT 10""",
}


def main():
    out = {k: sql(q) for k, q in Q.items()}
    if "--json" in sys.argv:
        return print(json.dumps(out, indent=1))
    print(f"remotecc.dev — last {DAYS} days")
    for k, rows in out.items():
        print(f"\n## {k}")
        for r in rows:
            print("  " + " · ".join(f"{v}" for v in r.values()))
        if not rows:
            print("  (none)")


if __name__ == "__main__":
    main()
