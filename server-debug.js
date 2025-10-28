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

// Debug middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug middleware para body
app.use((req, res, next) => {
  console.log('Body:', req.body);
  next();
});

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});