const http = require('http');
const fs = require('fs');
const path = require('path');
const ValetService = require('./src/services/ValetService');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API Routes
    if (req.url.startsWith('/api')) {
        try {
            // Helper to get body
            const getBody = () => new Promise((resolve) => {
                let body = '';
                req.on('data', chunk => body += chunk.toString());
                req.on('end', () => resolve(body ? JSON.parse(body) : {}));
            });

            if (req.url === '/api/reservations' && req.method === 'GET') {
                const data = await ValetService.getReservations();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
                return;
            }

            if (req.url === '/api/reservations' && req.method === 'POST') {
                const body = await getBody();
                const result = await ValetService.createReservation(body);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
                return;
            }

            // Regex for ID routes
            const idMatch = req.url.match(/\/api\/reservations\/([^\/]+)/);
            if (idMatch && req.method === 'PUT') {
                const id = idMatch[1];
                const body = await getBody();
                const result = await ValetService.updateReservation(id, body);
                if (result) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Not found' }));
                }
                return;
            }

            if (idMatch && req.method === 'DELETE') {
                const id = idMatch[1];
                await ValetService.deleteReservation(id);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
                return;
            }

            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Route not found' }));
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Static File Serving
    let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
    const extname = path.extname(filePath);
    let contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code == 'ENOENT') {
                res.writeHead(404);
                res.end('404 File Not Found');
            } else {
                res.writeHead(500);
                res.end('500 Internal Server Error: '+error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Valet Parking Server running on http://localhost:${PORT}`);
    console.log(`Data stored in /data directory`);
});
