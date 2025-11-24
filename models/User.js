const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'user'],
    default: 'user',
    required: true
  },
  companies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    phone: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true
});

// Índices para otimização
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Método para obter dados públicos do usuário
userSchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    profile: this.profile,
    companies: this.companies,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
};

// Método para verificar se o usuário é admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Método para verificar se o usuário é gerente
userSchema.methods.isManager = function() {
  return this.role === 'manager';
};

// Método para verificar se o usuário é admin ou gerente
userSchema.methods.isAdminOrManager = function() {
  return this.role === 'admin' || this.role === 'manager';
};

// Método para verificar se o usuário tem acesso a uma empresa
userSchema.methods.hasAccessToCompany = function(companyId) {
  if (this.role === 'admin') return true;
  // Suportar tanto ObjectIds simples quanto documentos populados
  return this.companies.some(c => {
    const id = c?._id ? c._id.toString() : c.toString();
    return id === companyId.toString();
  });
};

module.exports = mongoose.model('User', userSchema);
