#!/usr/bin/env python3
"""Serve this local UI package; no dependencies beyond Python 3."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit
import webbrowser

parser = argparse.ArgumentParser(description="OfferShow UI preview")
parser.add_argument("--port", type=int, default=0)
parser.add_argument("--no-browser", action="store_true")
args = parser.parse_args()
root = Path(__file__).resolve().parent
project_root = root.parent


class PreviewHandler(SimpleHTTPRequestHandler):
    """Expose the confirmed UI at /ui/ and project-level algorithm files at /."""

    def translate_path(self, path):
        clean_path = unquote(urlsplit(path).path)
        parts = [
            part for part in PurePosixPath(clean_path).parts
            if part not in ("/", ".", "..")
        ]
        base = project_root
        if parts and parts[0] == "ui":
            base = root
            parts = parts[1:]
        return str(base.joinpath(*parts))


with ThreadingHTTPServer(("127.0.0.1", args.port), PreviewHandler) as server:
    url = f"http://127.0.0.1:{server.server_port}/ui/index.html"
    print(f"OfferShow UI: {url}\nPress Ctrl+C to stop.", flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
