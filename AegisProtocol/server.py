#!/usr/bin/env python3
"""
AEGIS PROTOCOL: VECTOR DEFENSE
Lightweight Local HTTP Game Server

Usage:
    python server.py [port]
"""

import sys
import os
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

class AegisHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable aggressive caching for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def guess_type(self, path):
        # Ensure ES modules (.js) and SVG files have exact MIME types
        if path.endswith('.js') or path.endswith('.mjs'):
            return 'application/javascript'
        if path.endswith('.css'):
            return 'text/css'
        if path.endswith('.svg'):
            return 'image/svg+xml'
        if path.endswith('.json'):
            return 'application/json'
        return super().guess_type(path)

def run_server(port=8000):
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server_address = ('', port)
    httpd = HTTPServer(server_address, AegisHTTPRequestHandler)
    url = f"http://localhost:{port}/index.html"
    print("=" * 60)
    print("  AEGIS PROTOCOL: VECTOR DEFENSE - GAME SERVER")
    print("=" * 60)
    print(f"  [+] Local Server running at: {url}")
    print("  [+] Press Ctrl+C to terminate.")
    print("=" * 60)
    
    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  [-] Server stopped.")
        httpd.server_close()

if __name__ == '__main__':
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port: {sys.argv[1]}, using default 8000")
    run_server(port)
