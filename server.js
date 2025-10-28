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

// Import middleware
const authMiddleware = require('./middleware/auth');
const { authenticate } = require('./middleware/authorization');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://3.14.182.194:3001', 'http://localhost:3001'],
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

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

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

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
