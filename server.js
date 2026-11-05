const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

// Chỉ đọc: dữ liệu do quản trị viên sửa trực tiếp trong data/*.json, khách không ghi được.
const ROUTES = {
  '/api/combos': { file: 'combos.json', empty: '[]' },
  '/api/product-images': { file: 'product_images.json', empty: '{}' },
};
ROUTES['/combos'] = ROUTES['/api/combos'];
ROUTES['/product-images'] = ROUTES['/api/product-images'];

for (const r of new Set(Object.values(ROUTES))) {
  r.path = path.join(DATA_DIR, r.file);
  if (!fs.existsSync(r.path)) fs.writeFileSync(r.path, r.empty, 'utf8');
  r.cache = null; // { key, etag, raw, gz }
}

const json = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
};

// Đọc file 1 lần, gzip 1 lần; chỉ đọc lại khi file đổi. Client gửi If-None-Match -> 304, không tải lại.
function loadCache(r) {
  const st = fs.statSync(r.path);
  const key = st.mtimeMs + ':' + st.size;
  if (!r.cache || r.cache.key !== key) {
    const raw = fs.readFileSync(r.path);
    r.cache = {
      key, raw,
      gz: raw.length > 1024 ? zlib.gzipSync(raw) : null,
      etag: '"' + crypto.createHash('sha1').update(raw).digest('base64url') + '"',
    };
  }
  return r.cache;
}

function handleGet(req, res, r) {
  let c;
  try { c = loadCache(r); } catch (e) { return json(res, 500, { error: 'Cannot read data' }); }
  const headers = { ETag: c.etag, 'Cache-Control': 'no-cache', Vary: 'Accept-Encoding' };
  if (req.headers['if-none-match'] === c.etag) { res.writeHead(304, headers); return res.end(); }
  headers['Content-Type'] = 'application/json; charset=utf-8';
  const useGz = c.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (useGz) headers['Content-Encoding'] = 'gzip';
  const body = useGz ? c.gz : c.raw;
  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(body);
}

// File tĩnh (chạy trong container, không có nginx phía trước). Chỉ cho index.html và assets/, không lộ server.js/data/.git.
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
const ASSETS_DIR = path.join(__dirname, 'assets') + path.sep;

function handleStatic(req, res, urlPath) {
  const rel = urlPath === '/' ? '/index.html' : urlPath;
  const file = path.normalize(path.join(__dirname, rel));
  const allowed = file === path.join(__dirname, 'index.html') || file.startsWith(ASSETS_DIR);
  let st;
  try { st = allowed && fs.statSync(file); } catch (e) { st = null; }
  if (!st || !st.isFile()) return json(res, 404, { error: 'Not found' });
  const headers = {
    'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
    'Last-Modified': st.mtime.toUTCString(),
    'Cache-Control': file.startsWith(ASSETS_DIR) ? 'public, max-age=2592000' : 'no-cache',
  };
  const since = req.headers['if-modified-since'];
  if (since && Math.floor(st.mtimeMs / 1000) <= Math.floor(Date.parse(since) / 1000)) { res.writeHead(304, headers); return res.end(); }
  const gz = /\bgzip\b/.test(req.headers['accept-encoding'] || '') && /\.(html|js|css|json|svg)$/.test(file);
  if (gz) { headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'; }
  res.writeHead(200, headers);
  const stream = fs.createReadStream(file);
  stream.on('error', () => res.destroy());
  (gz ? stream.pipe(zlib.createGzip()) : stream).pipe(res);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'If-None-Match');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const urlPath = req.url.split('?')[0];
  const r = ROUTES[urlPath];
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed' });
  if (r) return handleGet(req, res, r);
  if (process.env.SERVE_STATIC === '1') return handleStatic(req, res, urlPath);
  json(res, 404, { error: 'Not found' });
});

// Chống treo kết nối chậm (slowloris) làm nghẽn server.
server.headersTimeout = 10000;
server.requestTimeout = 30000;
server.keepAliveTimeout = 5000;

const PORT = process.env.PORT || 3088;
const HOST = process.env.HOST || '127.0.0.1'; // container đặt HOST=0.0.0.0
server.listen(PORT, HOST, () => {
  console.log('TikTok Tools running on http://' + HOST + ':' + PORT);
});
