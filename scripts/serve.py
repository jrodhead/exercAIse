#!/usr/bin/env python3
import http.server
import socketserver
import os
import json


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        try:
            if self.path == '/api/kai/session-plan':
                # Read payload (unused for mock)
                length = int(self.headers.get('Content-Length', '0') or '0')
                _ = self.rfile.read(length) if length > 0 else b''
                mock_path = os.path.join(os.path.dirname(__file__), '..', 'serverless', 'api', 'kai', 'session-plan.mock.json')
                mock_path = os.path.abspath(mock_path)
                if not os.path.exists(mock_path):
                    # Minimal fallback inline
                    resp = {
                        "version": "1.0",
                        "title": "Home Strength — Sample",
                        "date": "",
                        "notes": "Sample response from local server; replace with real agent.",
                        "exercises": [
                            {"slug": "goblet_squat", "name": "Goblet Squat", "prescribed": {"sets": 3, "reps": 8, "rpe": 7}},
                            {"slug": "flat_dumbbell_bench_press", "name": "Flat DB Bench Press", "prescribed": {"sets": 3, "reps": 10, "rpe": 7}},
                            {"slug": "dumbbell_rdl", "name": "Dumbbell RDL", "prescribed": {"sets": 3, "reps": 8, "rpe": 7}}
                        ]
                    }
                    data = json.dumps(resp).encode('utf-8')
                else:
                    with open(mock_path, 'rb') as f:
                        data = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                self.wfile.write(data)
                return
        except Exception as e:
            try:
                self.send_response(500)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(('Server error: %s' % e).encode('utf-8'))
                return
            except Exception:
                pass
        # Fallback to default for other POST paths
        return super().do_POST()

PORT = int(os.environ.get('PORT', '8000'))

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
