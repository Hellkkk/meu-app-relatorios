const Purchase = require('../models/Purchase');

// Resumo geral - totais e contagem
exports.summary = async (req, res) => {
  try {
    const result = await Purchase.aggregate([
      {
        $group: {
          _id: null,
          totalCompras: { $sum: 1 },
          valorTotal: { $sum: '$valor_total' },
          totalICMS: { $sum: '$icms' },
          totalIPI: { $sum: '$ipi' },
          totalCOFINS: { $sum: '$cofins' }
        }
      }
    ]);

    const summary = result.length > 0 ? result[0] : {
      totalCompras: 0,
      valorTotal: 0,
      totalICMS: 0,
      totalIPI: 0,
      totalCOFINS: 0
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Erro ao obter resumo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter resumo',
      error: error.message
    });
  }
};

// Totais por fornecedor
exports.bySupplier = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const result = await Purchase.aggregate([
      {
        $group: {
          _id: '$fornecedor',
          total: { $sum: '$valor_total' },
          quantidade: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      { $limit: limit }
    ]);

    res.json({
      success: true,
      data: result.map(item => ({
        fornecedor: item._id || 'Não especificado',
        total: item.total,
        quantidade: item.quantidade
      }))
    });

  } catch (error) {
    console.error('Erro ao obter dados por fornecedor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter dados por fornecedor',
      error: error.message
    });
  }
};

// Totais por CFOP
exports.byCFOP = async (req, res) => {
  try {
    const result = await Purchase.aggregate([
      {
        $group: {
          _id: '$cfop',
          total: { $sum: '$valor_total' },
          quantidade: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({
      success: true,
      data: result.map(item => ({
        cfop: item._id || 'Não especificado',
        total: item.total,
        quantidade: item.quantidade
      }))
    });

  } catch (error) {
    console.error('Erro ao obter dados por CFOP:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter dados por CFOP',
      error: error.message
    });
  }
};

// Evolução mensal
exports.monthly = async (req, res) => {
  try {
    const result = await Purchase.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$data_compra' },
            month: { $month: '$data_compra' }
          },
          total: { $sum: '$valor_total' },
          quantidade: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Formatar para MM/AAAA
    const formatted = result.map(item => {
      const month = String(item._id.month).padStart(2, '0');
      const year = item._id.year;
      return {
        label: `${month}/${year}`,
        total: item.total,
        quantidade: item.quantidade,
        year: year,
        month: item._id.month
      };
    });

    res.json({
      success: true,
      data: formatted
    });

  } catch (error) {
    console.error('Erro ao obter dados mensais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter dados mensais',
      error: error.message
    });
  }
};

// Composição de impostos (para gráfico de pizza/rosca)
exports.taxesBreakdown = async (req, res) => {
  try {
    const result = await Purchase.aggregate([
      {
        $group: {
          _id: null,
          icms: { $sum: '$icms' },
          ipi: { $sum: '$ipi' },
          cofins: { $sum: '$cofins' }
        }
      }
    ]);

    const taxes = result.length > 0 ? result[0] : {
      icms: 0,
      ipi: 0,
      cofins: 0
    };

    res.json({
      success: true,
      data: [
        { name: 'ICMS', value: taxes.icms },
        { name: 'IPI', value: taxes.ipi },
        { name: 'COFINS', value: taxes.cofins }
      ]
    });

  } catch (error) {
    console.error('Erro ao obter composição de impostos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter composição de impostos',
      error: error.message
    });
  }
};
