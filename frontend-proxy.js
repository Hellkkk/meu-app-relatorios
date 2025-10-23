const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Log middleware para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check do frontend
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Frontend proxy server is running',
    timestamp: new Date().toISOString()
  });
});

// Proxy para API - configuração simplificada e corrigida
app.use('/api', createProxyMiddleware({
  target: 'http://127.0.0.1:5001',
  changeOrigin: true,
  logLevel: 'info',
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 PROXY: ${req.method} ${req.url} -> http://127.0.0.1:5001${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ RESPONSE: ${proxyRes.statusCode} for ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('❌ PROXY ERROR:', err.message);
    res.status(500).json({ error: 'Proxy Error', message: err.message });
  }
}));

// Servir arquivos estáticos do build
const distPath = path.join(__dirname, 'dist');
console.log('📁 Serving static files from:', distPath);

app.use(express.static(distPath));

// SPA fallback - todas as rotas não-API retornam index.html
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  console.log(`📄 SPA fallback: ${req.url} -> index.html`);
  res.sendFile(indexPath);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend server running on port ${PORT}`);
  console.log(`🔄 Proxying /api requests to http://127.0.0.1:5001`);
  console.log(`📁 Serving static files from ${distPath}`);
});