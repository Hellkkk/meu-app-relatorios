const mongoose = require('mongoose');

/**
 * LoginAudit Schema
 * Stores audit trail for login attempts (success and failure)
 */
const loginAuditSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  success: {
    type: Boolean,
    required: true
  },
  reason: {
    type: String,
    default: null
  },
  ip: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  // No automatic timestamps - we use manual timestamp field
  timestamps: false
});

// Index on timestamp for efficient querying and sorting
loginAuditSchema.index({ timestamp: -1 });

// Additional indexes for common query patterns
loginAuditSchema.index({ user: 1 });
loginAuditSchema.index({ email: 1 });
loginAuditSchema.index({ success: 1 });

module.exports = mongoose.model('LoginAudit', loginAuditSchema);
