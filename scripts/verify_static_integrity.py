#!/usr/bin/env python3
"""Read-only integrity gate for SWE Tournament static pages."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PAGES = ("index.html", "connexion.html")
ERRORS = []

class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "script" and "src" in a:
            self.refs.append(a["src"])
        if tag == "link" and a.get("rel") in ("stylesheet", "manifest", "icon", "apple-touch-icon") and "href" in a:
            self.refs.append(a["href"])

for page in PAGES:
    path = ROOT / page
    if not path.is_file():
        ERRORS.append(f"Missing HTML entrypoint: {page}")
        continue
    parser = Assets()
    parser.feed(path.read_text(encoding="utf-8"))
    for ref in parser.refs:
        parsed = urlsplit(ref)
        if parsed.scheme or parsed.netloc or ref.startswith(("data:", "#")):
            continue
        rel = parsed.path.lstrip("/")
        if not rel:
            continue
        asset = (ROOT / rel).resolve()
        if not asset.is_relative_to(ROOT.resolve()) or not asset.is_file():
            ERRORS.append(f"{page}: missing referenced asset {ref}")

for required in ("sw.js", "manifest.webmanifest", "app.js", "build-version.js"):
    if not (ROOT / required).is_file():
        ERRORS.append(f"Missing app core: {required}")

js_files = sorted(ROOT.rglob("*.js"))
for f in js_files:
    if any(part in ("node_modules", ".git") for part in f.parts):
        continue
    result = subprocess.run(["node", "--check", str(f)], capture_output=True, text=True)
    if result.returncode:
        ERRORS.append(f"JS syntax error: {f.relative_to(ROOT)}: {result.stderr.strip()[:300]}")

if ERRORS:
    print("\n".join("FAIL: " + err for err in ERRORS))
    sys.exit(1)
print(f"OK: {len(PAGES)} HTML pages; {len(js_files)} JS files checked, local referenced assets exist")
