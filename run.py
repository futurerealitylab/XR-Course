#Use to create local host
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

class FCPythonRequestHandler (http.server.SimpleHTTPRequestHandler):
      def end_headers (self):
            self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
            self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
            http.server.SimpleHTTPRequestHandler.end_headers(self)

Handler = FCPythonRequestHandler
Handler.extensions_map.update({
      ".js": "application/javascript",
})

httpd = socketserver.TCPServer(("", PORT), Handler)
httpd.serve_forever()
