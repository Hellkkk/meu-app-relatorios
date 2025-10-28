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

// Proxy para API com configuração mais robusta
const apiProxy = createProxyMiddleware({
  target: 'http://127.0.0.1:5001',
  changeOrigin: true,
  timeout: 10000,
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('❌ Proxy Error:', err.message);
    console.error('URL:', req.url);
    res.status(500).json({ 
      error: 'Proxy Error', 
      message: err.message,
      url: req.url 
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 Proxying: ${req.method} ${req.url} -> http://127.0.0.1:5001${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ Response: ${proxyRes.statusCode} for ${req.url}`);
  }
});

app.use('/api', apiProxy);

// Servir arquivos estáticos do build
const distPath = path.join(__dirname, 'dist');
console.log('📁 Serving static files from:', distPath);

app.use(express.static(distPath, {
  maxAge: '1d',
  etag: false
}));

// SPA fallback - todas as rotas não-API retornam index.html
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  console.log(`📄 Serving SPA: ${req.url} -> ${indexPath}`);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving index.html:', err);
      res.status(500).send('Error loading application');
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend server running on port ${PORT}`);
  console.log(`🔄 Proxying /api requests to http://127.0.0.1:5001`);
  console.log(`📁 Serving static files from ${distPath}`);
});