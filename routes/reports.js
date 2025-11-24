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
    const { type, limit } = req.query; // 'purchases' ou 'sales', limit (optional)
    
    // Validar type
    if (!type || !['purchases', 'sales'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de relatório inválido. Use "purchases" ou "sales".'
      });
    }
    
    // Parse limit with validation: default 500, min 1, max 1000
    const parsedLimit = parseInt(limit) || 500;
    const recordLimit = Math.min(Math.max(parsedLimit, 1), 1000);
    
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
    const summary = buildSummaryFromRecords(records, type, recordLimit);
    
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
 * @param {Array} records - Array de registros parseados
 * @param {string} type - 'purchases' ou 'sales'
 * @param {number} recordLimit - Número máximo de registros a retornar (default: 500)
 */
function buildSummaryFromRecords(records, type, recordLimit = 500) {
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
  
  // Sort records by date descending for better UX (most recent first)
  const sortedRecords = [...records].sort((a, b) => {
    const dateA = new Date(a[dateField] || 0);
    const dateB = new Date(b[dateField] || 0);
    return dateB - dateA;
  });
  
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
    records: sortedRecords.slice(0, recordLimit) // Retornar registros limitados, ordenados por data
  };
}

module.exports = router;