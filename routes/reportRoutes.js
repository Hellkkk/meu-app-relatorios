const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, requireAdminOrManager, requireCompanyAccess } = require('../middleware/authorization');

// @route   GET /api/purchase-reports/summary
// @desc    Obter resumo geral das compras
// @access  Private (Admin ou Manager)
// @note    Requer companyId via query parameter (?companyId=...), body ou params
router.get('/summary', authenticate, requireAdminOrManager, requireCompanyAccess, reportController.summary);

// @route   GET /api/purchase-reports/by-supplier
// @desc    Obter totais por fornecedor
// @access  Private (Admin ou Manager)
// @note    Requer companyId via query parameter (?companyId=...), body ou params
router.get('/by-supplier', authenticate, requireAdminOrManager, requireCompanyAccess, reportController.bySupplier);

// @route   GET /api/purchase-reports/by-cfop
// @desc    Obter totais por CFOP
// @access  Private (Admin ou Manager)
// @note    Requer companyId via query parameter (?companyId=...), body ou params
router.get('/by-cfop', authenticate, requireAdminOrManager, requireCompanyAccess, reportController.byCFOP);

// @route   GET /api/purchase-reports/monthly
// @desc    Obter evolução mensal
// @access  Private (Admin ou Manager)
// @note    Requer companyId via query parameter (?companyId=...), body ou params
router.get('/monthly', authenticate, requireAdminOrManager, requireCompanyAccess, reportController.monthly);

// @route   GET /api/purchase-reports/taxes-breakdown
// @desc    Obter composição de impostos
// @access  Private (Admin ou Manager)
// @note    Requer companyId via query parameter (?companyId=...), body ou params
router.get('/taxes-breakdown', authenticate, requireAdminOrManager, requireCompanyAccess, reportController.taxesBreakdown);

module.exports = router;
