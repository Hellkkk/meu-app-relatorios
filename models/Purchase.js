const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  data_compra: {
    type: Date,
    default: Date.now
  },
  fornecedor: {
    type: String,
    trim: true,
    index: true
  },
  cfop: {
    type: String,
    trim: true,
    index: true
  },
  numero_nfe: {
    type: String,
    trim: true
  },
  valor_total: {
    type: Number,
    default: 0
  },
  icms: {
    type: Number,
    default: 0
  },
  ipi: {
    type: Number,
    default: 0
  },
  cofins: {
    type: Number,
    default: 0
  },
  bruto: {
    type: Number,
    default: 0
  },
  outras_info: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  source_filename: {
    type: String,
    trim: true
  },
  imported_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para otimização de consultas
purchaseSchema.index({ fornecedor: 1, data_compra: -1 });
purchaseSchema.index({ cfop: 1, data_compra: -1 });
purchaseSchema.index({ source_filename: 1 });
purchaseSchema.index({ data_compra: -1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
