const mongoose = require('mongoose');

const salesRecordSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  tipo: {
    type: String,
    default: 'sales',
    enum: ['sales']
  },
  cliente: {
    type: String,
    trim: true,
    index: true
  },
  data_emissao: {
    type: Date,
    required: true,
    index: true
  },
  numero_nfe: {
    type: String,
    trim: true,
    index: true
  },
  cfop: {
    type: String,
    trim: true,
    index: true
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
  pis: {
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
  // Optional: keep original row data for auditing
  originalRow: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'sales_records'
});

// Compound index for uniqueness and efficient queries
salesRecordSchema.index({ companyId: 1, numero_nfe: 1 });

// Additional indices for search and filtering
salesRecordSchema.index({ companyId: 1, cliente: 1 });
salesRecordSchema.index({ companyId: 1, cfop: 1 });
salesRecordSchema.index({ companyId: 1, data_emissao: -1 });

module.exports = mongoose.model('SalesRecord', salesRecordSchema);
