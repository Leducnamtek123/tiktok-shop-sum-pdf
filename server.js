const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'combos.json');
const IMAGES_FILE = path.join(DATA_DIR, 'product_images.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

if (!fs.existsSync(IMAGES_FILE)) {
  fs.writeFileSync(IMAGES_FILE, '{}', 'utf8');
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  if (url === '/api/combos' || url === '/combos') {
    if (req.method === 'GET') {
      fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Cannot read data' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(data || '[]');
      });
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (!Array.isArray(parsed)) {
            throw new Error('Data must be an array');
          }
          fs.writeFile(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf8', (err) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Cannot save data' }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, count: parsed.length }));
          });
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON body: ' + err.message }));
        }
      });
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
  } else if (url === '/api/product-images' || url === '/product-images') {
    if (req.method === 'GET') {
      fs.readFile(IMAGES_FILE, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end('{}');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(data || '{}');
      });
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (typeof parsed !== 'object' || parsed === null) {
            throw new Error('Data must be an object');
          }
          fs.writeFile(IMAGES_FILE, JSON.stringify(parsed, null, 2), 'utf8', (err) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Cannot save product images' }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, count: Object.keys(parsed).length }));
          });
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON body: ' + err.message }));
        }
      });
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = process.env.PORT || 3088;
server.listen(PORT, '127.0.0.1', () => {
  console.log('TikTok Tools API running on http://127.0.0.1:' + PORT);
});
