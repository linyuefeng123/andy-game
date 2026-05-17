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

const STATIC_EXTS = new Set(Object.keys(MIME));
const HAS_HASH_RE = /-[a-zA-Z0-9]{8,}\./;

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  let urlPath = req.url.split('?')[0];
  let filePath = join(DIST, urlPath === '/' ? 'index.html' : urlPath);
  const ext = extname(filePath);

  if (existsSync(filePath) && filePath.startsWith(DIST)) {
    const contentType = MIME[ext] || 'application/octet-stream';
    const isHTML = ext === '.html';

    try {
      const data = readFileSync(filePath);

      let cacheControl;
      if (isHTML) {
        cacheControl = 'no-cache';
      } else if (HAS_HASH_RE.test(filePath)) {
        cacheControl = 'public, max-age=31536000, immutable';
      } else {
        cacheControl = 'public, max-age=3600';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', cacheControl);
      res.end(data);
      return;
    } catch {
      // fall through to 404
    }
  }

  // SPA fallback: only for non-file requests (no extension or .html)
  if (!STATIC_EXTS.has(ext)) {
    const indexPath = join(DIST, 'index.html');
    try {
      const data = readFileSync(indexPath);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.end(data);
      return;
    } catch {
      // fall through to 404
    }
  }

  // Real 404 for missing static files
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
