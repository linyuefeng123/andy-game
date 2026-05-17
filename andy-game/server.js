import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const PORT = process.env.PORT || 3000;
const DIST = join(process.cwd(), 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json',
};

const HAS_HASH_RE = /-[a-zA-Z0-9]{8,}\./;

const server = createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  let path = join(DIST, urlPath === '/' ? 'index.html' : urlPath);

  if (!existsSync(path) || !path.startsWith(DIST)) {
    path = join(DIST, 'index.html');
  }

  const ext = extname(path);
  const contentType = MIME[ext] || 'application/octet-stream';
  const isHTML = ext === '.html';

  try {
    const data = readFileSync(path);

    let cacheControl;
    if (isHTML) {
      cacheControl = 'no-cache';
    } else if (HAS_HASH_RE.test(path)) {
      cacheControl = 'public, max-age=31536000, immutable';
    } else {
      cacheControl = 'public, max-age=3600';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('Vary', 'Accept-Encoding');
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
