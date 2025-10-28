const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Log middleware para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Configuração mais robusta do proxy para API
const apiProxy = createProxyMiddleware({
  target: 'http://127.0.0.1:5001',
  changeOrigin: true,
  timeout: 10000,
  proxyTimeout: 10000,
  headers: {
    'Connection': 'keep-alive'
  },
  onError: (err, req, res) => {
    console.error('❌ Proxy error:', err.message);
    res.status(500).json({ 
      error: 'Proxy Error', 
      message: err.message,
      target: 'http://127.0.0.1:5001'
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 Proxying: ${req.method} ${req.url} -> http://127.0.0.1:5001${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ Proxy response: ${proxyRes.statusCode} for ${req.url}`);
  }
});

// Aplicar proxy para todas as rotas /api
app.use('/api', apiProxy);

// Servir arquivos estáticos do build
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - todas as rotas não-API retornam index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`🔄 Proxying /api requests to http://127.0.0.1:5001`);
});