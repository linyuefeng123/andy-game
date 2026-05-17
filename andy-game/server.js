import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { createGzip, createBrotliCompress } from 'zlib';
import { pipeline } from 'stream';

const PORT = process.env.PORT || 3000;
const DIST = join(process.cwd(), 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json',
};

const IMMUTABLE_EXTS = ['.js', '.mjs', '.css', '.woff2', '.woff', '.png', '.webp', '.svg'];
const HAS_HASH_RE = /-[a-zA-Z0-9]{8,}\./;

const server = createServer((req, res) => {
  let path = join(DIST, req.url === '/' ? 'index.html' : req.url);

  if (!existsSync(path) || !path.startsWith(DIST)) {
    path = join(DIST, 'index.html');
  }

  const ext = extname(path);
  const contentType = MIME[ext] || 'application/octet-stream';
  const isHTML = ext === '.html';

  try {
    const stat = statSync(path);
    const data = readFileSync(path);

    res.writeHead(200, {
      'Content-Type': contentType,
      ...getCacheHeaders(path, isHTML),
      'Vary': 'Accept-Encoding',
    });

    const acceptEncoding = req.headers['accept-encoding'] || '';

    if (!isHTML && acceptEncoding.includes('br')) {
      res.writeHead(200, {
        'Content-Type': contentType,
        ...getCacheHeaders(path, isHTML),
        'Vary': 'Accept-Encoding',
        'Content-Encoding': 'br',
      });
      pipeline(data, createBrotliCompress({ level: 4 }), res, () => {});
      return;
    }

    if (!isHTML && acceptEncoding.includes('gzip')) {
      res.writeHead(200, {
        'Content-Type': contentType,
        ...getCacheHeaders(path, isHTML),
        'Vary': 'Accept-Encoding',
        'Content-Encoding': 'gzip',
      });
      pipeline(data, createGzip({ level: 6 }), res, () => {});
      return;
    }

    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

function getCacheHeaders(filePath, isHTML) {
  const basename = filePath.split(/[/\\]/).pop() || '';

  if (isHTML) {
    return { 'Cache-Control': 'no-cache' };
  }

  if (IMMUTABLE_EXTS.some(e => basename.endsWith(e)) && HAS_HASH_RE.test(basename)) {
    return { 'Cache-Control': 'public, max-age=31536000, immutable' };
  }

  return { 'Cache-Control': 'public, max-age=3600' };
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
