const mongoose = require('mongoose');

const purchaseRecordSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  tipo: {
    type: String,
    default: 'purchases',
    enum: ['purchases']
  },
  fornecedor: {
    type: String,
    trim: true,
    index: true
  },
  data_compra: {
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
  collection: 'purchase_records'
});

// Compound index for uniqueness and efficient queries
purchaseRecordSchema.index({ companyId: 1, numero_nfe: 1 });

// Additional indices for search and filtering
purchaseRecordSchema.index({ companyId: 1, fornecedor: 1 });
purchaseRecordSchema.index({ companyId: 1, cfop: 1 });
purchaseRecordSchema.index({ companyId: 1, data_compra: -1 });

module.exports = mongoose.model('PurchaseRecord', purchaseRecordSchema);
