#!/usr/bin/env python3
"""CORS-enabled HTTP server for ASC browser JS injection.

Usage: python3 cors_server.py [port] [directory]
Default: port=8765, directory=/tmp
"""
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

class CORSHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory or '/tmp', **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        pass  # suppress logs

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    directory = sys.argv[2] if len(sys.argv) > 2 else '/tmp'
    CORSHandler.directory = directory
    server = HTTPServer(('127.0.0.1', port), lambda *a, **k: CORSHandler(*a, directory=directory, **k))
    print(f"CORS server on http://127.0.0.1:{port} serving {directory}")
    server.serve_forever()
