import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const PORT = process.env.PORT || 3000;
const DIST = join(process.cwd(), 'dist');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = createServer((req, res) => {
  let path = join(DIST, req.url === '/' ? 'index.html' : req.url);

  if (!existsSync(path) || !path.startsWith(DIST)) {
    path = join(DIST, 'index.html');
  }

  const ext = extname(path);
  const contentType = MIME[ext] || 'application/octet-stream';

  try {
    const data = readFileSync(path);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
