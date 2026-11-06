const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.join(__dirname, 'public');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(root, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
    if (!file.startsWith(`${root}${path.sep}`)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const content = await fs.readFile(file);
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    res.end(content);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log(`Bistro EPOS running at http://localhost:${process.env.PORT || 3000}`);
});
