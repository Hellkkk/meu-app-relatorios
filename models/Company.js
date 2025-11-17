const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome da empresa é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome da empresa não pode ter mais de 100 caracteres']
  },
  cnpj: {
    type: String,
     required: [true, 'Documento é obrigatório'],
    unique: true,
    trim: true,
    // Aceita CNPJ (14 dígitos formatados) OU CPF (11 dígitos formatados)
    match: [/^(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})$/, 'Documento deve estar no formato CNPJ (XX.XXX.XXX/XXXX-XX) ou CPF (XXX.XXX.XXX-XX)']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Descrição não pode ter mais de 500 caracteres']
  },
  sector: {
    type: String,
    trim: true,
    maxlength: [100, 'Setor não pode ter mais de 100 caracteres']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  responsibleUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  employees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  address: {
    street: String,
    number: String,
    complement: String,
    neighborhood: String,
    city: String,
    state: String,
    zipCode: String
  },
  contact: {
    phone: String,
    email: {
      type: String,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },
    website: String
  },
  purchasesReportPath: {
    type: String,
    trim: true
  },
  salesReportPath: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Índices para otimização
companySchema.index({ name: 1 });
companySchema.index({ cnpj: 1 });
companySchema.index({ isActive: 1 });

// Middleware para formatar CNPJ antes de salvar
companySchema.pre('save', function(next) {
  if (this.cnpj) {
    // Remove formatação e reaplica (CNPJ ou CPF)
    this.cnpj = this.cnpj.replace(/\D/g, '');
    if (this.cnpj.length === 14) {
      this.cnpj = this.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    } else if (this.cnpj.length === 11) {
      this.cnpj = this.cnpj.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }
  }
  next();
});

// Método para obter apenas dados públicos
companySchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    name: this.name,
    cnpj: this.cnpj,
    description: this.description,
    sector: this.sector,
    isActive: this.isActive,
    contact: this.contact,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Company', companySchema);