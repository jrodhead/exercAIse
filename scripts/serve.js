#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = process.env.PORT || 8000;

const mime = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.md': 'text/markdown; charset=UTF-8',
  '.ico': 'image/x-icon',
};

function safeJoin(base, target) {
  const resolved = path.resolve(base, target);
  if (!resolved.startsWith(base)) return base; // prevent path traversal
  return resolved;
}

// Ensure performed/index.json exists before serving
try {
  const spawn = require('child_process').spawnSync;
  spawn(process.execPath, [path.join(__dirname, 'build_performed_index.js')], { stdio: 'ignore' });
} catch (e) {}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = urlPath === '/' ? path.join(root, 'index.html') : safeJoin(root, urlPath.replace(/^\//, ''));
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, () => {
  console.log('Serving', root, 'on http://localhost:' + port);
});
