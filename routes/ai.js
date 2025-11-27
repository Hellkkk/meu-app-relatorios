const express = require('express');
const router = express.Router();
const { 
  authenticate, 
  requireAdminOrManagerCompanyAccess 
} = require('../middleware/authorization');
const aiService = require('../services/aiService');

// @route   GET /api/ai/status
// @desc    Get AI services status
// @access  Private
router.get('/status', authenticate, (req, res) => {
  const status = aiService.getAIStatus();
  res.json({
    success: true,
    data: status
  });
});

// @route   POST /api/ai/summary/:companyId
// @desc    Generate or retrieve AI summary for a company's report
// @access  Private (Admin or Manager with company access)
// Query params: type=purchases|sales, force=true|false
router.post('/summary/:companyId', authenticate, requireAdminOrManagerCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { type = 'purchases', force = 'false' } = req.query;
    
    // Validate type
    if (!['purchases', 'sales'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo inválido. Use "purchases" ou "sales".'
      });
    }
    
    // Check AI availability
    const status = aiService.getAIStatus();
    if (!status.gemini) {
      return res.status(503).json({
        success: false,
        message: 'Serviço de IA não disponível. Verifique a configuração de GOOGLE_API_KEY.',
        status
      });
    }
    
    const forceRegenerate = force === 'true';
    
    const result = await aiService.generateSummary(companyId, type, forceRegenerate);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[AI Summary Error]', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao gerar resumo de IA'
    });
  }
});

// @route   POST /api/ai/index/:companyId
// @desc    Index company records in Qdrant for semantic search
// @access  Private (Admin or Manager with company access)
// Query params: type=purchases|sales
router.post('/index/:companyId', authenticate, requireAdminOrManagerCompanyAccess, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { type = 'purchases' } = req.query;
    
    // Validate type
    if (!['purchases', 'sales'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo inválido. Use "purchases" ou "sales".'
      });
    }
    
    // Check AI availability
    const status = aiService.getAIStatus();
    if (!status.available) {
      return res.status(503).json({
        success: false,
        message: 'Serviços de IA não disponíveis. Verifique GOOGLE_API_KEY e QDRANT_URL.',
        status
      });
    }
    
    const result = await aiService.indexRecords(companyId, type);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[AI Index Error]', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao indexar registros'
    });
  }
});

// @route   GET /api/ai/search
// @desc    Semantic search / NLQ query across reports
// @access  Private (filtered by user's accessible companies)
// Query params: q=search query
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query (q) é obrigatório.'
      });
    }
    
    // Check AI availability
    const status = aiService.getAIStatus();
    if (!status.available) {
      return res.status(503).json({
        success: false,
        message: 'Serviços de IA não disponíveis. Verifique GOOGLE_API_KEY e QDRANT_URL.',
        status
      });
    }
    
    // Get user's accessible company IDs (empty for admin = no filter)
    const accessibleCompanyIds = aiService.getUserAccessibleCompanyIds(req.user);
    
    const result = await aiService.semanticSearch(q.trim(), accessibleCompanyIds);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[AI Search Error]', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro na busca semântica'
    });
  }
});

module.exports = router;
