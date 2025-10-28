const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Log middleware para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Query: ${JSON.stringify(req.query)}`);
  next();
});

// IMPORTANTE: Proxy DEVE vir ANTES do express.static
// Configuração mais robusta do proxy para API
const apiProxy = createProxyMiddleware('/api', {
  target: 'http://127.0.0.1:5001',
  changeOrigin: true,
  timeout: 10000,
  proxyTimeout: 10000,
  secure: false,
  headers: {
    'Connection': 'keep-alive'
  },
  onError: (err, req, res) => {
    console.error('❌ Proxy error:', err.message);
    console.error('❌ Request URL:', req.url);
    res.status(500).json({ 
      error: 'Proxy Error', 
      message: err.message,
      target: 'http://127.0.0.1:5001',
      url: req.url
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 PROXY: ${req.method} ${req.url} -> http://127.0.0.1:5001${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ PROXY RESPONSE: ${proxyRes.statusCode} for ${req.url}`);
  }
});

// Aplicar proxy para todas as rotas /api (ANTES de express.static)
app.use(apiProxy);

// Servir arquivos estáticos do build (DEPOIS do proxy)
app.use(express.static(path.join(__dirname, 'dist'), {
  index: false // Não servir index.html automaticamente
}));

// SPA fallback - todas as rotas não-API retornam index.html
app.get('*', (req, res) => {
  // Garantir que rotas /api não chegem aqui
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found', path: req.path });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`🔄 Proxying /api requests to http://127.0.0.1:5001`);
});