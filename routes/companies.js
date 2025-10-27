const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const User = require('../models/User');
const { authenticate, requireAdmin, requireAdminOrManager, filterCompaniesByUser, logActivity } = require('../middleware/authorization');

// @route   GET /api/companies
// @desc    Listar empresas (admin vê todas, gerente vê apenas suas, usuário vê apenas suas)
// @access  Private
router.get('/', authenticate, filterCompaniesByUser, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filtros opcionais
    let filter = req.companyFilter || {};
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { cnpj: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    if (req.query.sector) {
      filter.sector = { $regex: req.query.sector, $options: 'i' };
    }

    const companies = await Company.find(filter)
      .populate('createdBy', 'username email')
      .populate('responsibleUser', 'username email role')
      .populate('employees', 'username email isActive')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Company.countDocuments(filter);

    res.json({
      success: true,
      data: {
        companies,
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
      message: 'Erro ao buscar empresas',
      error: error.message
    });
  }
});

// @route   GET /api/companies/:id
// @desc    Obter detalhes de uma empresa específica
// @access  Private (usuário deve ter acesso à empresa)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('createdBy', 'username email')
      .populate('responsibleUser', 'username email role')
      .populate('employees', 'username email isActive');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    // Verificar se o usuário tem acesso à empresa
    if (!req.user.isAdmin() && !req.user.isManager() && !req.user.hasAccessToCompany(company._id)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado a esta empresa'
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar empresa',
      error: error.message
    });
  }
});

// @route   POST /api/companies
// @desc    Criar nova empresa (apenas admin)
// @access  Private/Admin
router.post('/', authenticate, requireAdmin, logActivity('CREATE_COMPANY'), async (req, res) => {
  try {
    const {
      name,
      cnpj,
      description,
      sector,
      responsibleUser,
      employees,
      address,
      contact
    } = req.body;

    // Verificar se já existe empresa com este CNPJ
    const existingCompany = await Company.findOne({ cnpj });
    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma empresa cadastrada com este CNPJ'
      });
    }

    const company = new Company({
      name,
      cnpj,
      description,
      sector,
      responsibleUser: responsibleUser || null,
      employees: employees || [],
      address,
      contact,
      createdBy: req.user._id
    });

    await company.save();

    // Atualizar os usuários para incluir a empresa na lista de empresas
    if (employees && employees.length > 0) {
      await User.updateMany(
        { _id: { $in: employees } },
        { $addToSet: { companies: company._id } }
      );
    }

    // Se há um responsável, adicionar a empresa a ele também
    if (responsibleUser) {
      await User.findByIdAndUpdate(
        responsibleUser,
        { $addToSet: { companies: company._id } }
      );
    }

    // Popular os dados para retorno
    await company.populate('responsibleUser', 'username email role');
    await company.populate('employees', 'username email isActive');

    res.status(201).json({
      success: true,
      message: 'Empresa criada com sucesso',
      data: company
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao criar empresa',
      error: error.message
    });
  }
});

// @route   PUT /api/companies/:id
// @desc    Atualizar empresa (admin ou gerente responsável)
// @access  Private/Admin or Manager
router.put('/:id', authenticate, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    // Verificar permissões: admin pode editar qualquer empresa, gerente apenas suas
    const isAdmin = req.user.isAdmin();
    const isResponsible = company.responsibleUser && company.responsibleUser.toString() === req.user._id.toString();
    
    if (!isAdmin && !isResponsible) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores ou responsáveis podem editar esta empresa.'
      });
    }

    const {
      name,
      cnpj,
      description,
      sector,
      isActive,
      responsibleUser,
      employees,
      address,
      contact
    } = req.body;

    // Se estiver alterando CNPJ, verificar se não existe outro com o mesmo
    if (cnpj && cnpj !== company.cnpj) {
      const existingCompany = await Company.findOne({ cnpj, _id: { $ne: company._id } });
      if (existingCompany) {
        return res.status(400).json({
          success: false,
          message: 'Já existe uma empresa cadastrada com este CNPJ'
        });
      }
    }

    // Remover empresa dos usuários antigos
    if (company.employees && company.employees.length > 0) {
      await User.updateMany(
        { _id: { $in: company.employees } },
        { $pull: { companies: company._id } }
      );
    }

    if (company.responsibleUser) {
      await User.findByIdAndUpdate(
        company.responsibleUser,
        { $pull: { companies: company._id } }
      );
    }

    // Atualizar campos
    if (name !== undefined) company.name = name;
    if (cnpj !== undefined) company.cnpj = cnpj;
    if (description !== undefined) company.description = description;
    if (sector !== undefined) company.sector = sector;
    
    // Apenas admin pode alterar status e responsável
    if (isAdmin) {
      if (isActive !== undefined) company.isActive = isActive;
      if (responsibleUser !== undefined) company.responsibleUser = responsibleUser || null;
    }
    
    // Admin e responsável podem alterar funcionários
    if (employees !== undefined) company.employees = employees || [];
    
    if (address !== undefined) company.address = { ...company.address, ...address };
    if (contact !== undefined) company.contact = { ...company.contact, ...contact };

    await company.save();

    // Adicionar empresa aos novos usuários
    if (company.employees && company.employees.length > 0) {
      await User.updateMany(
        { _id: { $in: company.employees } },
        { $addToSet: { companies: company._id } }
      );
    }

    if (company.responsibleUser) {
      await User.findByIdAndUpdate(
        company.responsibleUser,
        { $addToSet: { companies: company._id } }
      );
    }

    // Popular os dados para retorno
    await company.populate('responsibleUser', 'username email role');
    await company.populate('employees', 'username email isActive');

    res.json({
      success: true,
      message: 'Empresa atualizada com sucesso',
      data: company
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao atualizar empresa',
      error: error.message
    });
  }
});

// @route   DELETE /api/companies/:id
// @desc    Deletar empresa (apenas admin) - soft delete
// @access  Private/Admin
router.delete('/:id', authenticate, requireAdmin, logActivity('DELETE_COMPANY'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    // Soft delete - apenas desativa a empresa
    company.isActive = false;
    await company.save();

    res.json({
      success: true,
      message: 'Empresa desativada com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar empresa',
      error: error.message
    });
  }
});

// @route   GET /api/companies/stats/overview
// @desc    Obter estatísticas das empresas (apenas admin)
// @access  Private/Admin
router.get('/stats/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ isActive: true });
    const inactiveCompanies = await Company.countDocuments({ isActive: false });
    
    const companiesByMonth = await Company.aggregate([
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

    const companiesBySector = await Company.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$sector',
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
          total: totalCompanies,
          active: activeCompanies,
          inactive: inactiveCompanies
        },
        trends: {
          byMonth: companiesByMonth,
          bySector: companiesBySector
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas',
      error: error.message
    });
  }
});

// @route   DELETE /api/companies/:companyId/employees/:userId
// @desc    Remover funcionário de uma empresa
// @access  Private/Admin or Manager
router.delete('/:companyId/employees/:userId', authenticate, async (req, res) => {
  try {
    const { companyId, userId } = req.params;

    const company = await Company.findById(companyId);
    const user = await User.findById(userId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar permissões: admin ou responsável pela empresa
    const isAdmin = req.user.isAdmin();
    const isResponsible = company.responsibleUser && company.responsibleUser.toString() === req.user._id.toString();
    
    if (!isAdmin && !isResponsible) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores ou responsáveis podem remover funcionários.'
      });
    }

    // Verificar se o usuário está realmente vinculado à empresa
    const isEmployee = company.employees.some(empId => empId.toString() === userId);
    if (!isEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Usuário não está vinculado a esta empresa'
      });
    }

    // Não permitir remover o responsável da empresa desta forma
    if (company.responsibleUser && company.responsibleUser.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Para remover o responsável, primeiro defina outro responsável ou remova a responsabilidade'
      });
    }

    // Remover usuário da empresa
    company.employees = company.employees.filter(empId => empId.toString() !== userId);
    await company.save();

    // Remover empresa do usuário
    user.companies = user.companies.filter(compId => compId.toString() !== companyId);
    await user.save();

    // Retornar empresa atualizada
    const updatedCompany = await Company.findById(companyId)
      .populate('responsibleUser', 'username email role')
      .populate('employees', 'username email isActive');

    res.json({
      success: true,
      message: 'Funcionário removido da empresa com sucesso',
      data: updatedCompany
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao remover funcionário da empresa',
      error: error.message
    });
  }
});

// @route   POST /api/companies/:companyId/employees/:userId
// @desc    Adicionar funcionário a uma empresa
// @access  Private/Admin or Manager
router.post('/:companyId/employees/:userId', authenticate, async (req, res) => {
  try {
    const { companyId, userId } = req.params;

    const company = await Company.findById(companyId);
    const user = await User.findById(userId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if (!company.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível adicionar funcionário a uma empresa inativa'
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível adicionar usuário inativo'
      });
    }

    // Verificar permissões: admin ou responsável pela empresa
    const isAdmin = req.user.isAdmin();
    const isResponsible = company.responsibleUser && company.responsibleUser.toString() === req.user._id.toString();
    
    if (!isAdmin && !isResponsible) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores ou responsáveis podem adicionar funcionários.'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Administradores têm acesso a todas as empresas automaticamente'
      });
    }

    // Verificar se já está vinculado
    const alreadyEmployee = company.employees.some(empId => empId.toString() === userId);
    if (alreadyEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já é funcionário desta empresa'
      });
    }

    // Adicionar usuário à empresa
    company.employees.push(userId);
    await company.save();

    // Adicionar empresa ao usuário
    user.companies.push(companyId);
    await user.save();

    // Retornar empresa atualizada
    const updatedCompany = await Company.findById(companyId)
      .populate('responsibleUser', 'username email role')
      .populate('employees', 'username email isActive');

    res.json({
      success: true,
      message: 'Funcionário adicionado à empresa com sucesso',
      data: updatedCompany
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao adicionar funcionário à empresa',
      error: error.message
    });
  }
});

// @route   PUT /api/companies/:companyId/responsible/:userId
// @desc    Definir responsável por uma empresa
// @access  Private/Admin
router.put('/:companyId/responsible/:userId', authenticate, requireAdmin, logActivity('SET_COMPANY_RESPONSIBLE'), async (req, res) => {
  try {
    const { companyId, userId } = req.params;

    const company = await Company.findById(companyId);
    const user = await User.findById(userId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível definir usuário inativo como responsável'
      });
    }

    if (user.role === 'user') {
      return res.status(400).json({
        success: false,
        message: 'Apenas gerentes ou administradores podem ser responsáveis por empresas'
      });
    }

    // Remover responsabilidade do usuário anterior (se houver)
    if (company.responsibleUser) {
      const oldResponsible = await User.findById(company.responsibleUser);
      if (oldResponsible) {
        oldResponsible.companies = oldResponsible.companies.filter(compId => compId.toString() !== companyId);
        await oldResponsible.save();
      }
    }

    // Definir novo responsável
    company.responsibleUser = userId;
    await company.save();

    // Adicionar empresa ao usuário se não estiver já
    if (!user.companies.some(compId => compId.toString() === companyId)) {
      user.companies.push(companyId);
      await user.save();
    }

    // Adicionar usuário como funcionário se não estiver já
    if (!company.employees.some(empId => empId.toString() === userId)) {
      company.employees.push(userId);
      await company.save();
    }

    // Retornar empresa atualizada
    const updatedCompany = await Company.findById(companyId)
      .populate('responsibleUser', 'username email role')
      .populate('employees', 'username email isActive');

    res.json({
      success: true,
      message: 'Responsável definido com sucesso',
      data: updatedCompany
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao definir responsável',
      error: error.message
    });
  }
});

// @route   DELETE /api/companies/:companyId/responsible
// @desc    Remover responsável de uma empresa
// @access  Private/Admin
router.delete('/:companyId/responsible', authenticate, requireAdmin, logActivity('REMOVE_COMPANY_RESPONSIBLE'), async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    if (!company.responsibleUser) {
      return res.status(400).json({
        success: false,
        message: 'Esta empresa não possui responsável definido'
      });
    }

    // Remover empresa do usuário responsável
    const responsible = await User.findById(company.responsibleUser);
    if (responsible) {
      responsible.companies = responsible.companies.filter(compId => compId.toString() !== companyId);
      await responsible.save();
    }

    // Remover responsável da empresa
    company.responsibleUser = null;
    await company.save();

    // Retornar empresa atualizada
    const updatedCompany = await Company.findById(companyId)
      .populate('responsibleUser', 'username email role')
      .populate('employees', 'username email isActive');

    res.json({
      success: true,
      message: 'Responsável removido com sucesso',
      data: updatedCompany
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao remover responsável',
      error: error.message
    });
  }
});

module.exports = router;