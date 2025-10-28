const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');
const { authenticate, requireAdmin, logActivity } = require('../middleware/authorization');

// @route   GET /api/admin/users
// @desc    Listar todos os usuários (apenas admin)
// @access  Private/Admin
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let filter = {};
    
    // Filtros opcionais
    if (req.query.search) {
      filter.$or = [
        { username: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { 'profile.firstName': { $regex: req.query.search, $options: 'i' } },
        { 'profile.lastName': { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const users = await User.find(filter)
      .populate('companies', 'name cnpj')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users: users.map(user => user.getPublicData()),
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
      message: 'Erro ao buscar usuários',
      error: error.message
    });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Obter detalhes de um usuário específico
// @access  Private/Admin
router.get('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('companies', 'name cnpj sector isActive')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      data: user.getPublicData()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar usuário',
      error: error.message
    });
  }
});

// @route   POST /api/admin/users
// @desc    Criar novo usuário (apenas admin)
// @access  Private/Admin
router.post('/users', authenticate, requireAdmin, logActivity('CREATE_USER'), async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role = 'user',
      companies = [],
      profile = {}
    } = req.body;

    // Verificar se usuário já existe
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Usuário com este email ou username já existe'
      });
    }

    // Verificar se as empresas existem
    if (companies.length > 0) {
      const existingCompanies = await Company.find({
        _id: { $in: companies },
        isActive: true
      });
      
      if (existingCompanies.length !== companies.length) {
        return res.status(400).json({
          success: false,
          message: 'Uma ou mais empresas especificadas não existem ou estão inativas'
        });
      }
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      role,
      companies: role === 'admin' ? [] : companies, // Admin não precisa de empresas específicas
      profile
    });

    await user.save();

    // Retornar usuário sem senha
    const userWithoutPassword = await User.findById(user._id)
      .populate('companies', 'name cnpj')
      .select('-password');

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: userWithoutPassword.getPublicData()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao criar usuário',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Atualizar usuário (apenas admin)
// @access  Private/Admin
router.put('/users/:id', authenticate, requireAdmin, logActivity('UPDATE_USER'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const {
      username,
      email,
      password,
      role,
      companies,
      isActive,
      profile
    } = req.body;

    // Verificar se email/username já existe em outro usuário
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Este email já está sendo usado por outro usuário'
        });
      }
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Este username já está sendo usado por outro usuário'
        });
      }
    }

    // Verificar se as empresas existem (se fornecidas)
    if (companies && companies.length > 0) {
      const existingCompanies = await Company.find({
        _id: { $in: companies },
        isActive: true
      });
      
      if (existingCompanies.length !== companies.length) {
        return res.status(400).json({
          success: false,
          message: 'Uma ou mais empresas especificadas não existem ou estão inativas'
        });
      }
    }

    // Atualizar campos
    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    
    // Admin não precisa de empresas específicas
    if (companies !== undefined && role !== 'admin') {
      user.companies = companies;
    } else if (role === 'admin') {
      user.companies = [];
    }
    
    if (profile !== undefined) {
      user.profile = { ...user.profile, ...profile };
    }

    // Atualizar senha se fornecida
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    // Retornar usuário atualizado sem senha
    const updatedUser = await User.findById(user._id)
      .populate('companies', 'name cnpj')
      .select('-password');

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: updatedUser.getPublicData()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao atualizar usuário',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Deletar usuário (apenas admin) - soft delete
// @access  Private/Admin
router.delete('/users/:id', authenticate, requireAdmin, logActivity('DELETE_USER'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Não permitir que admin delete a si mesmo
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Você não pode deletar sua própria conta'
      });
    }

    // Soft delete - apenas desativa o usuário
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'Usuário desativado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar usuário',
      error: error.message
    });
  }
});

// @route   PUT /api/admin/users/:id/companies
// @desc    Associar/desassociar empresas a um usuário
// @access  Private/Admin
router.put('/users/:id/companies', authenticate, requireAdmin, logActivity('UPDATE_USER_COMPANIES'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Administradores têm acesso a todas as empresas automaticamente'
      });
    }

    const { companies } = req.body;

    if (!Array.isArray(companies)) {
      return res.status(400).json({
        success: false,
        message: 'Companies deve ser um array'
      });
    }

    // Verificar se as empresas existem
    if (companies.length > 0) {
      const existingCompanies = await Company.find({
        _id: { $in: companies },
        isActive: true
      });
      
      if (existingCompanies.length !== companies.length) {
        return res.status(400).json({
          success: false,
          message: 'Uma ou mais empresas especificadas não existem ou estão inativas'
        });
      }
    }

    user.companies = companies;
    await user.save();

    // Retornar usuário atualizado
    const updatedUser = await User.findById(user._id)
      .populate('companies', 'name cnpj')
      .select('-password');

    res.json({
      success: true,
      message: 'Empresas do usuário atualizadas com sucesso',
      data: updatedUser.getPublicData()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao atualizar empresas do usuário',
      error: error.message
    });
  }
});

// @route   GET /api/admin/stats/users
// @desc    Obter estatísticas dos usuários
// @access  Private/Admin
router.get('/stats/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const regularUsers = await User.countDocuments({ role: 'user' });

    const usersByMonth = await User.aggregate([
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

    const lastLoginStats = await User.aggregate([
      { $match: { lastLogin: { $exists: true } } },
      {
        $group: {
          _id: null,
          avgDaysSinceLastLogin: {
            $avg: {
              $divide: [
                { $subtract: [new Date(), '$lastLogin'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          admins: adminUsers,
          users: regularUsers
        },
        trends: {
          byMonth: usersByMonth,
          avgDaysSinceLastLogin: lastLoginStats[0]?.avgDaysSinceLastLogin || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas de usuários',
      error: error.message
    });
  }
});

// @route   DELETE /api/admin/users/:userId/companies/:companyId
// @desc    Remover usuário de uma empresa específica
// @access  Private/Admin
router.delete('/users/:userId/companies/:companyId', authenticate, requireAdmin, logActivity('REMOVE_USER_FROM_COMPANY'), async (req, res) => {
  try {
    const { userId, companyId } = req.params;

    const user = await User.findById(userId);
    const company = await Company.findById(companyId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Administradores têm acesso a todas as empresas automaticamente'
      });
    }

    // Remover empresa do usuário
    user.companies = user.companies.filter(compId => compId.toString() !== companyId);
    await user.save();

    // Remover usuário da empresa
    company.employees = company.employees.filter(empId => empId.toString() !== userId);
    
    // Se o usuário era responsável, remover responsabilidade
    if (company.responsibleUser && company.responsibleUser.toString() === userId) {
      company.responsibleUser = null;
    }
    
    await company.save();

    // Retornar usuário atualizado
    const updatedUser = await User.findById(userId)
      .populate('companies', 'name cnpj')
      .select('-password');

    res.json({
      success: true,
      message: 'Usuário removido da empresa com sucesso',
      data: updatedUser.getPublicData()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao remover usuário da empresa',
      error: error.message
    });
  }
});

// @route   POST /api/admin/users/:userId/companies/:companyId
// @desc    Adicionar usuário a uma empresa específica
// @access  Private/Admin
router.post('/users/:userId/companies/:companyId', authenticate, requireAdmin, logActivity('ADD_USER_TO_COMPANY'), async (req, res) => {
  try {
    const { userId, companyId } = req.params;

    const user = await User.findById(userId);
    const company = await Company.findById(companyId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    if (!company.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível adicionar usuário a uma empresa inativa'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Administradores têm acesso a todas as empresas automaticamente'
      });
    }

    // Verificar se já está vinculado
    const alreadyLinked = user.companies.some(compId => compId.toString() === companyId);
    if (alreadyLinked) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já está vinculado a esta empresa'
      });
    }

    // Adicionar empresa ao usuário
    user.companies.push(companyId);
    await user.save();

    // Adicionar usuário à empresa
    company.employees.push(userId);
    await company.save();

    // Retornar usuário atualizado
    const updatedUser = await User.findById(userId)
      .populate('companies', 'name cnpj')
      .select('-password');

    res.json({
      success: true,
      message: 'Usuário adicionado à empresa com sucesso',
      data: updatedUser.getPublicData()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao adicionar usuário à empresa',
      error: error.message
    });
  }
});

// Endpoint para estatísticas de vínculos usuário-empresa
router.get('/user-company-stats', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    // Buscar todos os usuários e empresas
    const users = await User.find({ role: { $ne: 'admin' } }).populate('companies');
    const companies = await Company.find({ isActive: true }).populate('employees');

    // Calcular estatísticas
    const stats = {
      totalUsers: users.length,
      totalCompanies: companies.length,
      usersWithCompanies: users.filter(user => user.companies && user.companies.length > 0).length,
      usersWithoutCompanies: users.filter(user => !user.companies || user.companies.length === 0).length,
      companiesWithEmployees: companies.filter(company => company.employees && company.employees.length > 0).length,
      companiesWithoutEmployees: companies.filter(company => !company.employees || company.employees.length === 0).length,
      totalLinks: users.reduce((total, user) => total + (user.companies ? user.companies.length : 0), 0),
      avgLinksPerUser: 0,
      avgEmployeesPerCompany: 0,
      inconsistencies: 0
    };

    // Calcular médias
    if (stats.totalUsers > 0) {
      stats.avgLinksPerUser = parseFloat((stats.totalLinks / stats.totalUsers).toFixed(2));
    }

    if (stats.totalCompanies > 0) {
      stats.avgEmployeesPerCompany = parseFloat((companies.reduce((total, company) => 
        total + (company.employees ? company.employees.length : 0), 0) / stats.totalCompanies).toFixed(2));
    }

    // Detectar inconsistências (usuários vinculados mas não na lista de funcionários)
    let inconsistencyCount = 0;
    for (const user of users) {
      if (user.companies) {
        for (const userCompany of user.companies) {
          const company = companies.find(c => c._id.toString() === userCompany._id.toString());
          if (company) {
            const isEmployee = company.employees?.some(emp => emp._id.toString() === user._id.toString());
            const isResponsible = company.responsibleUser && company.responsibleUser.toString() === user._id.toString();
            if (!isEmployee && !isResponsible) {
              inconsistencyCount++;
            }
          }
        }
      }
    }
    stats.inconsistencies = inconsistencyCount;

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular estatísticas',
      error: error.message
    });
  }
});

module.exports = router;

module.exports = router;