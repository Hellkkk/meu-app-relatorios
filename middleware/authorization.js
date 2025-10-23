const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware básico de autenticação (já existe no auth.js atual)
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).populate('companies');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token or inactive user.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token.',
      error: error.message
    });
  }
};

// Middleware para verificar se o usuário é admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (!req.user.isAdmin()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Middleware para verificar se o usuário é admin ou gerente
const requireAdminOrManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (!req.user.isAdmin() && !req.user.isManager()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Manager privileges required.'
    });
  }

  next();
};

// Middleware para verificar acesso a uma empresa específica
const requireCompanyAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  const companyId = req.params.companyId || req.body.companyId || req.query.companyId;
  
  if (!companyId) {
    return res.status(400).json({
      success: false,
      message: 'Company ID is required.'
    });
  }

  // Admin tem acesso a todas as empresas
  if (req.user.isAdmin()) {
    return next();
  }

  // Verificar se o usuário tem acesso à empresa
  if (!req.user.hasAccessToCompany(companyId)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to access this company.'
    });
  }

  next();
};

// Middleware para filtrar empresas baseado no usuário
const filterCompaniesByUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  // Admin vê todas as empresas - não aplica filtro
  if (req.user.isAdmin()) {
    return next();
  }

  // Gerentes e usuários normais veem apenas suas empresas
  req.companyFilter = {
    _id: { $in: req.user.companies }
  };

  next();
};

// Middleware para log de atividades (opcional)
const logActivity = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log apenas se a operação foi bem-sucedida
      if (res.statusCode < 400) {
        console.log(`[${new Date().toISOString()}] ${action} - User: ${req.user?.username || 'Unknown'} (${req.user?.role || 'Unknown'}) - IP: ${req.ip}`);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  authenticate,
  requireAdmin,
  requireAdminOrManager,
  requireCompanyAccess,
  filterCompaniesByUser,
  logActivity
};