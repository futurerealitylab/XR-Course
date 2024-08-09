#Use to create local host
import http.server
import socketserver
import ssl
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4443

class FCPythonRequestHandler (http.server.SimpleHTTPRequestHandler):
      def end_headers (self):
            self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
            self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
            http.server.SimpleHTTPRequestHandler.end_headers(self)
      def handle(self):
            super().handle()
            # # self.request is the TCP socket connected to the client
            # self.data = self.request.recv(1024).strip()
            # print("{} wrote:".format(self.client_address[0]))
            # print(self.data)
            # # just send back the same data, but upper-cased
            # self.request.sendall(self.data.upper())            

Handler = FCPythonRequestHandler
Handler.extensions_map.update({
      ".js": "application/javascript",
})

server_address = ('', PORT)
httpd = http.server.HTTPServer(server_address, FCPythonRequestHandler)
# can generate for local development using e.g. https://github.com/FiloSottile/mkcert
httpd.socket = ssl.wrap_socket(httpd.socket,
                               server_side=True,
                               certfile='localhost+2.pem',
                               keyfile='localhost+2-key.pem',
                               ssl_version=ssl.PROTOCOL_TLS)
httpd.serve_forever()
