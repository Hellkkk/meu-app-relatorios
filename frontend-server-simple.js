const express = require('express');
const http = require('http');
const path = require('path');

const app = express();

// Log middleware para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Parse JSON para requisições
app.use(express.json());

// Health check do frontend
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Frontend proxy server is running',
    timestamp: new Date().toISOString()
  });
});

// Proxy manual para API
app.use('/api', (req, res) => {
  console.log(`🔄 Proxying: ${req.method} ${req.url} -> http://127.0.0.1:5001${req.url}`);
  
  const options = {
    hostname: '127.0.0.1',
    port: 5001,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: '127.0.0.1:5001'
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    console.log(`✅ Response: ${proxyRes.statusCode} for ${req.url}`);
    
    // Copiar headers da resposta
    res.status(proxyRes.statusCode);
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });

    // Pipe da resposta
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('❌ Proxy Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Proxy Error', 
        message: err.message,
        url: req.url 
      });
    }
  });

  // Se há body na requisição, enviar para o proxy
  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }
  
  // Finalizar requisição
  proxyReq.end();
});

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