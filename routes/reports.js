const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Company = require('../models/Company');
const { authenticate, requireAdmin, requireCompanyAccess, filterCompaniesByUser, logActivity } = require('../middleware/authorization');

// @route   GET /api/reports
// @desc    Listar relatórios (filtrado por empresas do usuário)
// @access  Private
router.get('/', authenticate, filterCompaniesByUser, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let filter = {};
    
    // Aplicar filtro de empresas baseado no usuário
    if (req.companyFilter) {
      const userCompanies = await Company.find(req.companyFilter).select('_id');
      filter.company = { $in: userCompanies.map(c => c._id) };
    }
    
    // Filtros opcionais
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(req.query.search, 'i')] } }
      ];
    }
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.companyId) {
      // Verificar se o usuário tem acesso à empresa
      if (!req.user.isAdmin() && !req.user.hasAccessToCompany(req.query.companyId)) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado a esta empresa'
        });
      }
      filter.company = req.query.companyId;
    }
    
    // Filtro por período
    if (req.query.startDate || req.query.endDate) {
      filter['period.startDate'] = {};
      filter['period.endDate'] = {};
      
      if (req.query.startDate) {
        filter['period.startDate'].$gte = new Date(req.query.startDate);
      }
      
      if (req.query.endDate) {
        filter['period.endDate'].$lte = new Date(req.query.endDate);
      }
    }

    const reports = await Report.find(filter)
      .populate('company', 'name cnpj')
      .populate('createdBy', 'username email')
      .select('-data') // Não retornar dados completos na listagem
      .sort({ lastAccessed: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Report.countDocuments(filter);

    res.json({
      success: true,
      data: {
        reports: reports.map(report => report.getPublicData()),
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar relatórios',
      error: error.message
    });
  }
});

// @route   GET /api/reports/stats/overview
// @desc    Obter estatísticas dos relatórios por empresa
// @access  Private
router.get('/stats/overview', authenticate, filterCompaniesByUser, async (req, res) => {
  try {
    let matchFilter = {};
    
    // Aplicar filtro de empresas baseado no usuário
    if (req.companyFilter) {
      const userCompanies = await Company.find(req.companyFilter).select('_id');
      matchFilter.company = { $in: userCompanies.map(c => c._id) };
    }

    const totalReports = await Report.countDocuments(matchFilter);
    
    const reportsByType = await Report.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const reportsByStatus = await Report.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const reportsByMonth = await Report.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    const reportsByCompany = await Report.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'companies',
          localField: 'company',
          foreignField: '_id',
          as: 'companyInfo'
        }
      },
      { $unwind: '$companyInfo' },
      {
        $group: {
          _id: '$company',
          name: { $first: '$companyInfo.name' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          total: totalReports,
          byType: reportsByType,
          byStatus: reportsByStatus
        },
        trends: {
          byMonth: reportsByMonth,
          byCompany: reportsByCompany
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas de relatórios',
      error: error.message
    });
  }
});

// @route   GET /api/reports/templates
// @desc    Obter templates de relatórios disponíveis
// @access  Private
router.get('/templates', authenticate, (req, res) => {
  const templates = [
    {
      id: 'financeiro-basico',
      name: 'Relatório Financeiro Básico',
      type: 'financeiro',
      description: 'Relatório com indicadores financeiros essenciais',
      fields: [
        { name: 'receita', label: 'Receita Total', type: 'currency' },
        { name: 'despesas', label: 'Despesas Totais', type: 'currency' },
        { name: 'lucro', label: 'Lucro Líquido', type: 'currency' },
        { name: 'margem', label: 'Margem de Lucro', type: 'percentage' }
      ]
    },
    {
      id: 'vendas-mensal',
      name: 'Relatório de Vendas Mensal',
      type: 'vendas',
      description: 'Análise de vendas por período mensal',
      fields: [
        { name: 'vendas_total', label: 'Total de Vendas', type: 'currency' },
        { name: 'quantidade', label: 'Quantidade Vendida', type: 'number' },
        { name: 'ticket_medio', label: 'Ticket Médio', type: 'currency' },
        { name: 'crescimento', label: 'Crescimento vs Mês Anterior', type: 'percentage' }
      ]
    },
    {
      id: 'operacional-kpis',
      name: 'KPIs Operacionais',
      type: 'operacional',
      description: 'Indicadores chave de performance operacional',
      fields: [
        { name: 'produtividade', label: 'Produtividade', type: 'percentage' },
        { name: 'eficiencia', label: 'Eficiência Operacional', type: 'percentage' },
        { name: 'qualidade', label: 'Índice de Qualidade', type: 'number' },
        { name: 'satisfacao', label: 'Satisfação do Cliente', type: 'percentage' }
      ]
    }
  ];

  res.json({
    success: true,
    data: templates
  });
});

// @route   GET /api/reports/xlsx-files
// @desc    Listar todos os arquivos .xlsx disponíveis no diretório configurado
// @access  Private/Admin
router.get('/xlsx-files', authenticate, requireAdmin, async (req, res) => {
  try {
    const { discoverExcelFiles } = require('../utils/excelFileDiscovery');
    const files = discoverExcelFiles();
    
    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar arquivos Excel',
      error: error.message
    });
  }
});

// @route   GET /api/reports/:id
// @desc    Obter detalhes completos de um relatório
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('company', 'name cnpj sector')
      .populate('createdBy', 'username email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Relatório não encontrado'
      });
    }

    // Verificar se o usuário tem acesso à empresa do relatório
    if (!req.user.isAdmin() && !req.user.hasAccessToCompany(report.company._id)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este relatório'
      });
    }

    // Atualizar último acesso
    await report.updateLastAccessed();

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar relatório',
      error: error.message
    });
  }
});

// @route   POST /api/reports
// @desc    Criar novo relatório
// @access  Private
router.post('/', authenticate, logActivity('CREATE_REPORT'), async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      period,
      companyId,
      data = {},
      metadata = {},
      tags = []
    } = req.body;

    // Verificar se a empresa existe e o usuário tem acesso
    const company = await Company.findById(companyId);
    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada ou inativa'
      });
    }

    if (!req.user.isAdmin() && !req.user.hasAccessToCompany(companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta empresa'
      });
    }

    const report = new Report({
      title,
      description,
      type,
      period,
      company: companyId,
      createdBy: req.user._id,
      data,
      metadata,
      tags,
      status: 'draft'
    });

    await report.save();

    const populatedReport = await Report.findById(report._id)
      .populate('company', 'name cnpj')
      .populate('createdBy', 'username email');

    res.status(201).json({
      success: true,
      message: 'Relatório criado com sucesso',
      data: populatedReport
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao criar relatório',
      error: error.message
    });
  }
});

// @route   PUT /api/reports/:id
// @desc    Atualizar relatório
// @access  Private
router.put('/:id', authenticate, logActivity('UPDATE_REPORT'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Relatório não encontrado'
      });
    }

    // Verificar se o usuário tem acesso à empresa do relatório
    if (!req.user.isAdmin() && !req.user.hasAccessToCompany(report.company)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a este relatório'
      });
    }

    const {
      title,
      description,
      type,
      period,
      data,
      metadata,
      tags,
      status
    } = req.body;

    // Atualizar campos
    if (title !== undefined) report.title = title;
    if (description !== undefined) report.description = description;
    if (type !== undefined) report.type = type;
    if (period !== undefined) report.period = period;
    if (data !== undefined) report.data = { ...report.data, ...data };
    if (metadata !== undefined) report.metadata = { ...report.metadata, ...metadata };
    if (tags !== undefined) report.tags = tags;
    if (status !== undefined) report.status = status;

    await report.save();

    const updatedReport = await Report.findById(report._id)
      .populate('company', 'name cnpj')
      .populate('createdBy', 'username email');

    res.json({
      success: true,
      message: 'Relatório atualizado com sucesso',
      data: updatedReport
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao atualizar relatório',
      error: error.message
    });
  }
});

// @route   DELETE /api/reports/:id
// @desc    Deletar relatório
// @access  Private
router.delete('/:id', authenticate, logActivity('DELETE_REPORT'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Relatório não encontrado'
      });
    }

    // Verificar se o usuário tem acesso à empresa do relatório ou é o criador
    if (!req.user.isAdmin() && 
        !req.user.hasAccessToCompany(report.company) && 
        report.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para deletar este relatório'
      });
    }

    await Report.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Relatório deletado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar relatório',
      error: error.message
    });
  }
});

// @route   GET /api/reports/:companyId/summary
// @desc    Obter resumo de relatórios para uma empresa (Compras ou Vendas)
// @access  Private
router.get('/:companyId/summary', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { type } = req.query; // 'purchases' ou 'sales'
    
    // Validar type
    if (!type || !['purchases', 'sales'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de relatório inválido. Use "purchases" ou "sales".'
      });
    }
    
    // Verificar se a empresa existe
    const company = await Company.findById(companyId);
    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada ou inativa'
      });
    }
    
    // Verificar se o usuário tem acesso à empresa
    if (!req.user.isAdmin() && !req.user.hasAccessToCompany(companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta empresa'
      });
    }
    
    // Obter o caminho do arquivo configurado
    const reportPath = type === 'purchases' 
      ? company.purchasesReportPath 
      : company.salesReportPath;
    
    // Debug logging (only in debug mode)
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[SUMMARY] companyId=${companyId} type=${type} purchasesPath=${company.purchasesReportPath} salesPath=${company.salesReportPath} selected=${reportPath}`);
    }
    
    if (!reportPath) {
      return res.status(404).json({
        success: false,
        message: `Nenhum arquivo de relatório de ${type === 'purchases' ? 'Compras' : 'Vendas'} configurado para esta empresa`
      });
    }
    
    // Obter caminho absoluto e verificar se o arquivo existe
    const { getExcelFilePath } = require('../utils/excelFileDiscovery');
    const filePath = getExcelFilePath(reportPath);
    
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[SUMMARY] resolved=${filePath}`);
    }
    
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo de relatório não encontrado'
      });
    }
    
    // Parsear o arquivo Excel
    const { parseExcelFile } = require('../utils/excelParser');
    const records = parseExcelFile(filePath, type);
    
    // Construir resumo/dashboard a partir dos dados
    const summary = buildSummaryFromRecords(records, type);
    
    // Add fileName and type to response for debugging
    summary.fileName = reportPath;
    summary.type = type;
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Erro ao gerar resumo de relatório:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar resumo de relatório',
      error: error.message
    });
  }
});

/**
 * Constrói um resumo/dashboard a partir dos registros parseados
 */
function buildSummaryFromRecords(records, type) {
  const entityField = type === 'purchases' ? 'fornecedor' : 'cliente';
  const dateField = type === 'purchases' ? 'data_compra' : 'data_emissao';
  
  // Calcular totais usando campos canônicos
  let totalValue = 0;
  let totalICMS = 0;
  let totalIPI = 0;
  let totalCOFINS = 0;
  let totalPIS = 0;
  
  records.forEach(record => {
    totalValue += record.valor_total || 0;
    totalICMS += record.icms || 0;
    totalIPI += record.ipi || 0;
    totalCOFINS += record.cofins || 0;
    totalPIS += record.pis || 0; // Use canonical pis field
  });
  
  // Agrupar por entidade (fornecedor/cliente)
  const byEntity = {};
  records.forEach(record => {
    const entity = record[entityField] || 'Não informado';
    if (!byEntity[entity]) {
      byEntity[entity] = {
        name: entity,
        total: 0,
        count: 0
      };
    }
    byEntity[entity].total += record.valor_total || 0;
    byEntity[entity].count += 1;
  });
  
  // Top 10 entidades
  const topEntities = Object.values(byEntity)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  
  // Agrupar por mês usando campo canônico de data
  const byMonth = {};
  records.forEach(record => {
    const dateStr = record[dateField];
    if (!dateStr) return;
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;
    
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = {
        month: monthKey,
        total: 0,
        count: 0
      };
    }
    byMonth[monthKey].total += record.valor_total || 0;
    byMonth[monthKey].count += 1;
  });
  
  const monthlyData = Object.values(byMonth)
    .sort((a, b) => a.month.localeCompare(b.month));
  
  return {
    summary: {
      totalRecords: records.length,
      totalValue,
      totalICMS,
      totalIPI,
      totalCOFINS,
      totalPIS,
      averageValue: records.length > 0 ? totalValue / records.length : 0
    },
    byEntity: topEntities,
    byMonth: monthlyData,
    taxesBreakdown: [
      { name: 'ICMS', value: totalICMS },
      { name: 'IPI', value: totalIPI },
      { name: 'COFINS', value: totalCOFINS },
      { name: 'PIS', value: totalPIS }
    ],
    records: records.slice(0, 100) // Retornar apenas os primeiros 100 registros para visualização
  };
}

// Rate limiting for sync endpoint - store last sync time per company+type
const syncRateLimits = new Map();
const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// @route   POST /api/reports/:companyId/sync
// @desc    Manually trigger sync of Excel data to database
// @access  Private (Admin/Manager only)
router.post('/:companyId/sync', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { type } = req.query; // 'purchases' or 'sales'

    // Validate type
    if (!type || !['purchases', 'sales'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Use "purchases" or "sales".'
      });
    }

    // Check if company exists
    const company = await Company.findById(companyId);
    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Company not found or inactive'
      });
    }

    // Check user access
    if (!req.user.isAdmin() && !req.user.hasAccessToCompany(companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this company'
      });
    }

    // Rate limiting check
    const rateLimitKey = `${companyId}-${type}`;
    const lastSync = syncRateLimits.get(rateLimitKey);
    const now = Date.now();
    
    if (lastSync && (now - lastSync) < SYNC_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((SYNC_COOLDOWN_MS - (now - lastSync)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSeconds} seconds before syncing again`,
        cooldownRemaining: remainingSeconds
      });
    }

    // Perform sync
    const { syncExcelToDb } = require('../services/syncService');
    const result = await syncExcelToDb(companyId, type);

    // Update rate limit timestamp
    syncRateLimits.set(rateLimitKey, now);

    res.json({
      success: true,
      message: `Successfully synced ${result.inserted} ${type} records`,
      data: result
    });
  } catch (error) {
    console.error('Error syncing data:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing data',
      error: error.message
    });
  }
});

// @route   GET /api/reports/:companyId/records
// @desc    Get paginated records from database
// @access  Private
router.get('/:companyId/records', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { type, page = 0, pageSize = 10, search = '' } = req.query;

    // Validate type
    if (!type || !['purchases', 'sales'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Use "purchases" or "sales".'
      });
    }

    // Check if company exists
    const company = await Company.findById(companyId);
    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Company not found or inactive'
      });
    }

    // Check user access
    if (!req.user.isAdmin() && !req.user.hasAccessToCompany(companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this company'
      });
    }

    // Get appropriate model
    const PurchaseRecord = require('../models/PurchaseRecord');
    const SalesRecord = require('../models/SalesRecord');
    const Model = type === 'purchases' ? PurchaseRecord : SalesRecord;

    // Check if collection is empty and trigger auto-sync if needed
    const { isCollectionEmpty, syncExcelToDb } = require('../services/syncService');
    const isEmpty = await isCollectionEmpty(companyId, type);
    
    if (isEmpty) {
      console.log(`[RECORDS] Collection empty for ${companyId}/${type}, triggering auto-sync...`);
      try {
        await syncExcelToDb(companyId, type);
      } catch (syncError) {
        console.error('[RECORDS] Auto-sync failed:', syncError);
        // Continue even if sync fails - will return empty results
      }
    }

    // Build search filter
    const filter = { companyId };
    
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const entityField = type === 'purchases' ? 'fornecedor' : 'cliente';
      
      filter.$or = [
        { [entityField]: searchRegex },
        { numero_nfe: searchRegex },
        { cfop: searchRegex }
      ];
    }

    // Parse pagination parameters
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    const skip = pageNum * pageSizeNum;

    // Get total count
    const total = await Model.countDocuments(filter);

    // Get paginated records
    const dateField = type === 'purchases' ? 'data_compra' : 'data_emissao';
    const records = await Model.find(filter)
      .sort({ [dateField]: -1 })
      .skip(skip)
      .limit(pageSizeNum)
      .lean();

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total,
          totalPages: Math.ceil(total / pageSizeNum)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching records',
      error: error.message
    });
  }
});

// @route   GET /api/reports/:companyId/summary (UPDATED)
// @desc    Get summary using aggregations on persisted data
// @access  Private
// Note: This route must come after the more specific routes above
router.get('/:companyId/summary-from-db', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { type } = req.query;

    // Validate type
    if (!type || !['purchases', 'sales'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Use "purchases" or "sales".'
      });
    }

    // Check if company exists
    const company = await Company.findById(companyId);
    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Company not found or inactive'
      });
    }

    // Check user access
    if (!req.user.isAdmin() && !req.user.hasAccessToCompany(companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this company'
      });
    }

    // Get appropriate model
    const PurchaseRecord = require('../models/PurchaseRecord');
    const SalesRecord = require('../models/SalesRecord');
    const Model = type === 'purchases' ? PurchaseRecord : SalesRecord;

    // Check if collection is empty and trigger auto-sync if needed
    const { isCollectionEmpty, syncExcelToDb } = require('../services/syncService');
    const isEmpty = await isCollectionEmpty(companyId, type);
    
    if (isEmpty) {
      console.log(`[SUMMARY] Collection empty for ${companyId}/${type}, triggering auto-sync...`);
      await syncExcelToDb(companyId, type);
    }

    // Aggregate summary data
    const entityField = type === 'purchases' ? 'fornecedor' : 'cliente';
    const dateField = type === 'purchases' ? 'data_compra' : 'data_emissao';

    // Get overall stats
    const statsAgg = await Model.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalValue: { $sum: '$valor_total' },
          totalICMS: { $sum: '$icms' },
          totalIPI: { $sum: '$ipi' },
          totalPIS: { $sum: '$pis' },
          totalCOFINS: { $sum: '$cofins' },
          averageValue: { $avg: '$valor_total' }
        }
      }
    ]);

    const stats = statsAgg[0] || {
      totalRecords: 0,
      totalValue: 0,
      totalICMS: 0,
      totalIPI: 0,
      totalPIS: 0,
      totalCOFINS: 0,
      averageValue: 0
    };

    // Get top entities
    const topEntitiesAgg = await Model.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: `$${entityField}`,
          total: { $sum: '$valor_total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          name: '$_id',
          total: 1,
          count: 1
        }
      }
    ]);

    // Get monthly data
    const monthlyAgg = await Model.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: {
            year: { $year: `$${dateField}` },
            month: { $month: `$${dateField}` }
          },
          total: { $sum: '$valor_total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' }
                ]
              }
            ]
          },
          total: 1,
          count: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        summary: stats,
        byEntity: topEntitiesAgg,
        byMonth: monthlyAgg,
        taxesBreakdown: [
          { name: 'ICMS', value: stats.totalICMS },
          { name: 'IPI', value: stats.totalIPI },
          { name: 'COFINS', value: stats.totalCOFINS },
          { name: 'PIS', value: stats.totalPIS }
        ],
        type
      }
    });
  } catch (error) {
    console.error('Error generating summary from DB:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating summary',
      error: error.message
    });
  }
});

module.exports = router;