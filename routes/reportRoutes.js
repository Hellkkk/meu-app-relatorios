const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/authorization');

// @route   GET /api/purchase-reports/summary
// @desc    Obter resumo geral das compras
// @access  Private (autenticado)
router.get('/summary', authenticate, reportController.summary);

// @route   GET /api/purchase-reports/by-supplier
// @desc    Obter totais por fornecedor
// @access  Private (autenticado)
router.get('/by-supplier', authenticate, reportController.bySupplier);

// @route   GET /api/purchase-reports/by-cfop
// @desc    Obter totais por CFOP
// @access  Private (autenticado)
router.get('/by-cfop', authenticate, reportController.byCFOP);

// @route   GET /api/purchase-reports/monthly
// @desc    Obter evolução mensal
// @access  Private (autenticado)
router.get('/monthly', authenticate, reportController.monthly);

// @route   GET /api/purchase-reports/taxes-breakdown
// @desc    Obter composição de impostos
// @access  Private (autenticado)
router.get('/taxes-breakdown', authenticate, reportController.taxesBreakdown);

module.exports = router;
