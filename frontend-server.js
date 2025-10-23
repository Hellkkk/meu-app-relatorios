const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Log middleware para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Proxy para API
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Proxy Error:', err.message);
    res.status(500).json({ error: 'Proxy Error', message: err.message });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxy Request:', req.method, req.path, '-> http://localhost:5001' + req.path);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('Proxy Response:', proxyRes.statusCode, req.path);
  }
}));

// Servir arquivos estáticos do build
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - todas as rotas não-API retornam index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`Proxying /api requests to http://localhost:5001`);
});