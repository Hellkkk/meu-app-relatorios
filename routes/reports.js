const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Company = require('../models/Company');
const { authenticate, requireCompanyAccess, filterCompaniesByUser, logActivity } = require('../middleware/authorization');

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

module.exports = router;