import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';

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

const compressCache = new Map();

function compress(data, encoding) {
  const key = `${data.length}:${encoding}`;
  if (compressCache.has(key)) return compressCache.get(key);
  let result;
  if (encoding === 'br') {
    result = brotliCompressSync(data);
  } else {
    result = gzipSync(data);
  }
  if (data.length < 500000) {
    compressCache.set(key, result);
  }
  return result;
}

const server = createServer((req, res) => {
  let path = join(DIST, req.url === '/' ? 'index.html' : req.url);

  if (!existsSync(path) || !path.startsWith(DIST)) {
    path = join(DIST, 'index.html');
  }

  const ext = extname(path);
  const contentType = MIME[ext] || 'application/octet-stream';
  const isHTML = ext === '.html';

  try {
    const data = readFileSync(path);
    const cacheHeaders = getCacheHeaders(path, isHTML);
    const acceptEncoding = req.headers['accept-encoding'] || '';

    if (!isHTML && data.length > 200 && acceptEncoding.includes('br')) {
      const compressed = compress(data, 'br');
      res.writeHead(200, {
        'Content-Type': contentType,
        ...cacheHeaders,
        'Vary': 'Accept-Encoding',
        'Content-Encoding': 'br',
      });
      res.end(compressed);
      return;
    }

    if (!isHTML && data.length > 200 && acceptEncoding.includes('gzip')) {
      const compressed = compress(data, 'gzip');
      res.writeHead(200, {
        'Content-Type': contentType,
        ...cacheHeaders,
        'Vary': 'Accept-Encoding',
        'Content-Encoding': 'gzip',
      });
      res.end(compressed);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      ...cacheHeaders,
      'Vary': 'Accept-Encoding',
    });
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
