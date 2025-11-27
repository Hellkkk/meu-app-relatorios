const mongoose = require('mongoose');

const reportAISchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  type: {
    type: String,
    enum: ['purchases', 'sales'],
    required: true
  },
  summary: {
    type: String,
    default: null
  },
  summaryUpdatedAt: {
    type: Date,
    default: null
  },
  embeddingsIndexedAt: {
    type: Date,
    default: null
  },
  chunks: {
    type: Number,
    default: 0
  },
  meta: {
    recordsSampled: {
      type: Number,
      default: 0
    },
    totalRecords: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Unique compound index for company + type
reportAISchema.index({ company: 1, type: 1 }, { unique: true });

// Method to get public data
reportAISchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    company: this.company,
    type: this.type,
    hasSummary: !!this.summary,
    summaryUpdatedAt: this.summaryUpdatedAt,
    embeddingsIndexedAt: this.embeddingsIndexedAt,
    chunks: this.chunks,
    meta: this.meta,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('ReportAI', reportAISchema);
