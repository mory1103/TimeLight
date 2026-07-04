import os, sys
os.chdir("/Users/morieharuka/Desktop/claude/develop/TimeLight")
from http.server import HTTPServer, SimpleHTTPRequestHandler
HTTPServer(("", 3456), SimpleHTTPRequestHandler).serve_forever()
