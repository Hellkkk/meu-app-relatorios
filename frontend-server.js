const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Load environment variables
const localEnvPath = path.resolve(__dirname, '.env');
const parentEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(localEnvPath)) {
  require('dotenv').config({ path: localEnvPath });
} else if (fs.existsSync(parentEnvPath)) {
  require('dotenv').config({ path: parentEnvPath });
} else {
  require('dotenv').config();
}

const app = express();

// Configuration from environment variables
const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
const BACKEND_PORT = process.env.BACKEND_PORT || 5001;
const FRONTEND_PORT = process.env.FRONTEND_PORT || process.env.PORT || 3001;
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

// Log warning if using PORT instead of FRONTEND_PORT
if (!process.env.FRONTEND_PORT && process.env.PORT) {
  console.warn('⚠️  WARNING: Using PORT variable for frontend. Consider using FRONTEND_PORT instead.');
  console.warn('   Set FRONTEND_PORT=3001 in your .env file for clarity.');
}

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
  const fullPath = `/api${req.url}`;
  console.log(`🔄 Proxying: ${req.method} ${fullPath} -> ${BACKEND_URL}${fullPath}`);
  
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: fullPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${BACKEND_HOST}:${BACKEND_PORT}`
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    console.log(`✅ Response: ${proxyRes.statusCode} for ${fullPath}`);
    
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
    console.error(`   Target: ${BACKEND_URL}${fullPath}`);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Proxy Error', 
        message: err.message,
        target: `${BACKEND_URL}${fullPath}`,
        hint: 'Make sure the backend server is running on the configured port'
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
  maxAge: 0,
  etag: false,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
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

const PORT = FRONTEND_PORT;
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('🚀 Frontend Proxy Server Started');
  console.log('='.repeat(60));
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔄 Proxying /api to: ${BACKEND_URL}`);
  console.log(`📁 Serving static files from: ${distPath}`);
  console.log('='.repeat(60));
});