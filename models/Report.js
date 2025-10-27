const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Título do relatório é obrigatório'],
    trim: true,
    maxlength: [200, 'Título não pode ter mais de 200 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Descrição não pode ter mais de 1000 caracteres']
  },
  type: {
    type: String,
    required: [true, 'Tipo do relatório é obrigatório'],
    enum: ['financeiro', 'operacional', 'vendas', 'rh', 'marketing', 'customizado'],
    default: 'customizado'
  },
  period: {
    startDate: {
      type: Date,
      required: [true, 'Data inicial é obrigatória']
    },
    endDate: {
      type: Date,
      required: [true, 'Data final é obrigatória']
    }
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Empresa é obrigatória']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário criador é obrigatório']
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // Dados flexíveis do relatório
    default: {}
  },
  metadata: {
    totalRecords: {
      type: Number,
      default: 0
    },
    dataSource: {
      type: String,
      trim: true
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    charts: [{
      type: {
        type: String,
        enum: ['bar', 'line', 'pie', 'area', 'table']
      },
      title: String,
      data: mongoose.Schema.Types.Mixed
    }]
  },
  status: {
    type: String,
    enum: ['draft', 'processing', 'completed', 'error'],
    default: 'draft'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para otimização
reportSchema.index({ company: 1, createdAt: -1 });
reportSchema.index({ type: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
reportSchema.index({ tags: 1 });

// Middleware para validar datas
reportSchema.pre('save', function(next) {
  if (this.period.startDate > this.period.endDate) {
    next(new Error('Data inicial deve ser anterior à data final'));
  }
  next();
});

// Método para obter dados públicos
reportSchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    title: this.title,
    description: this.description,
    type: this.type,
    period: this.period,
    company: this.company,
    createdBy: this.createdBy,
    metadata: {
      totalRecords: this.metadata.totalRecords,
      dataSource: this.metadata.dataSource
    },
    status: this.status,
    tags: this.tags,
    lastAccessed: this.lastAccessed,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Método para atualizar último acesso
reportSchema.methods.updateLastAccessed = function() {
  this.lastAccessed = new Date();
  return this.save();
};

module.exports = mongoose.model('Report', reportSchema);