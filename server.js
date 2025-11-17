const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const localEnvPath = path.resolve(__dirname, '.env');
const parentEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(localEnvPath)) {
  require('dotenv').config({ path: localEnvPath });
} else if (fs.existsSync(parentEnvPath)) {
  require('dotenv').config({ path: parentEnvPath });
} else {
  require('dotenv').config();
}

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
const purchaseRoutes = require('./routes/purchaseRoutes');
const purchaseReportRoutes = require('./routes/reportRoutes');

// Import middleware
const authMiddleware = require('./middleware/auth');
const { authenticate } = require('./middleware/authorization');

// Initialize Express app
const app = express();

// Middleware
const CLIENT_URL = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:3001';
const allowedOrigins = [CLIENT_URL, 'http://localhost:3001'];
// Add EC2 IP if different from CLIENT_URL
if (CLIENT_URL.includes('3.14.182.194') === false) {
  allowedOrigins.push('http://3.14.182.194:3001');
}

app.use(cors({
  origin: allowedOrigins,
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
    timestamp: new Date().toISOString(),
    port: process.env.BACKEND_PORT || process.env.PORT || 5001
  });
});

// Version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    success: true,
    version: '1.0.0',
    node: process.version,
    env: process.env.NODE_ENV || 'development'
  });
});

// Start server
// Use BACKEND_PORT with fallback to PORT for compatibility
const PORT = process.env.BACKEND_PORT || process.env.PORT || 5001;

// Log warning if using PORT instead of BACKEND_PORT
if (!process.env.BACKEND_PORT && process.env.PORT) {
  console.warn('⚠️  WARNING: Using PORT variable for backend. Consider using BACKEND_PORT instead.');
  console.warn('   Set BACKEND_PORT=5001 in your .env file for clarity.');
}

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 Backend API Server Started');
  console.log('='.repeat(60));
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Version: http://localhost:${PORT}/api/version`);
  console.log(`🔒 CORS Origins: ${allowedOrigins.join(', ')}`);
  console.log('='.repeat(60));
});
