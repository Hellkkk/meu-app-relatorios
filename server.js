const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Enhanced .env loading with logging
const localEnvPath = path.resolve(__dirname, '.env');
const parentEnvPath = path.resolve(__dirname, '../.env');

let envFileLoaded = 'none';
if (fs.existsSync(localEnvPath)) {
  require('dotenv').config({ path: localEnvPath });
  envFileLoaded = localEnvPath;
} else if (fs.existsSync(parentEnvPath)) {
  require('dotenv').config({ path: parentEnvPath });
  envFileLoaded = parentEnvPath;
} else {
  require('dotenv').config();
  envFileLoaded = 'default (.env from cwd)';
}

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const adminRoutes = require('./routes/admin');
const adminAuditRoutes = require('./routes/adminAudit');
const reportRoutes = require('./routes/reports');
const purchaseRoutes = require('./routes/purchaseRoutes');
const purchaseReportRoutes = require('./routes/reportRoutes');

// Import middleware
const authMiddleware = require('./middleware/auth');
const { authenticate } = require('./middleware/authorization');

// Initialize Express app
const app = express();

// Track server start time for uptime calculation
const serverStartTime = Date.now();

// Middleware
app.use(cors({
  origin: [
    'http://3.14.182.194:3001',
    'http://3.14.182.194',
    'http://localhost:3001',
    'http://localhost:3000'
  ],
  credentials: true
}));

// JSON parsing com configuração mais robusta
app.use(express.json({ 
  limit: '50mb',
  strict: false,
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.error('JSON Parse Error:', e.message);
      console.error('Raw body:', buf.toString());
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true,
  limit: '50mb'
}));

// Connect to MongoDB and auto-import Excel data
connectDB().then(async () => {
  // Auto-import data from repository Excel file on startup
  const enableAutoImport = process.env.ENABLE_REPO_EXCEL_BOOTSTRAP !== 'false';
  
  if (enableAutoImport) {
    try {
      const { importPurchasesFromRepoSource } = require('./services/excelSourceLoader');
      console.log('Auto-importando dados da planilha do repositório...');
      const result = await importPurchasesFromRepoSource({ mode: 'replace' });
      console.log(`Auto-importação concluída: ${result.imported} registros importados`);
    } catch (error) {
      console.error('Erro na auto-importação (continuando execução):', error.message);
    }
  } else {
    console.log('Auto-importação desabilitada (ENABLE_REPO_EXCEL_BOOTSTRAP=false)');
  }
}).catch(err => {
  console.error('Erro fatal na conexão MongoDB:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminAuditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/purchase-reports', purchaseReportRoutes);

// Protected route example (can be used for testing)
app.get('/api/protected', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Access to protected route granted',
    user: req.user.getPublicData()
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Version endpoint - returns app version info
app.get('/api/version', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  const mongoConnected = mongoose.connection.readyState === 1;
  
  res.json({
    success: true,
    data: {
      commit: process.env.APP_COMMIT || 'unknown',
      port: process.env.BACKEND_PORT || process.env.PORT || 5001,
      pid: process.pid,
      uptimeSeconds,
      mongoConnected,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Readiness endpoint - returns 200 if ready, 503 if not
app.get('/api/readiness', (req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  
  if (mongoConnected) {
    res.status(200).json({
      success: true,
      message: 'Server is ready',
      mongo: 'connected'
    });
  } else {
    res.status(503).json({
      success: false,
      message: 'Server is not ready',
      mongo: 'disconnected'
    });
  }
});

// Start server with enhanced configuration
const BACKEND_PORT = process.env.BACKEND_PORT || process.env.PORT || 5001;
const BACKEND_HOST = process.env.BACKEND_HOST || '0.0.0.0';

// Log warning if using fallback PORT
if (!process.env.BACKEND_PORT && process.env.PORT) {
  console.warn('[STARTUP WARNING] Using PORT instead of BACKEND_PORT. Consider using BACKEND_PORT for clarity.');
}

app.listen(BACKEND_PORT, BACKEND_HOST, () => {
  console.log('[STARTUP] Backend server configuration:');
  console.log(`  envFileLoaded: ${envFileLoaded}`);
  console.log(`  cwd: ${process.cwd()}`);
  console.log(`  backendPort: ${BACKEND_PORT}`);
  console.log(`  backendHost: ${BACKEND_HOST}`);
  console.log(`  commit: ${process.env.APP_COMMIT || 'unknown'}`);
  console.log(`  pid: ${process.pid}`);
  console.log(`  nodeVersion: ${process.version}`);
  console.log(`Server running on http://${BACKEND_HOST}:${BACKEND_PORT}`);
  
  // Count and log registered routes
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push(middleware.route);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push(handler.route);
        }
      });
    }
  });
  console.log(`[STARTUP] Total routes registered: ${routes.length}`);
});
