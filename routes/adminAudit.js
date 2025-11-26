const express = require('express');
const router = express.Router();
const LoginAudit = require('../models/LoginAudit');
const { authenticate, requireAdmin } = require('../middleware/authorization');

/**
 * @route   GET /api/admin/audit
 * @desc    List login audit entries with pagination and filters (admin only)
 * @access  Private/Admin
 * @query   page (default 1), limit (default 50, max 200)
 * @query   userId - filter by user ID
 * @query   email - filter by email
 * @query   success - filter by success (true|false)
 * @query   since - filter by timestamp >= ISODate
 */
router.get('/audit', authenticate, requireAdmin, async (req, res) => {
  try {
    // Pagination parameters
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 50;
    
    // Enforce limits
    if (page < 1) page = 1;
    if (limit < 1) limit = 1;
    if (limit > 200) limit = 200;
    
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    // Filter by userId
    if (req.query.userId) {
      filter.user = req.query.userId;
    }

    // Filter by email
    if (req.query.email) {
      filter.email = req.query.email.toLowerCase();
    }

    // Filter by success status
    if (req.query.success !== undefined) {
      filter.success = req.query.success === 'true';
    }

    // Filter by timestamp (since)
    if (req.query.since) {
      const sinceDate = new Date(req.query.since);
      if (!isNaN(sinceDate.getTime())) {
        filter.timestamp = { $gte: sinceDate };
      }
    }

    // Execute query with pagination
    const [items, total] = await Promise.all([
      LoginAudit.find(filter)
        .populate('user', 'username email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      LoginAudit.countDocuments(filter)
    ]);

    res.json({
      success: true,
      items,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Audit list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
      error: error.message
    });
  }
});

module.exports = router;
