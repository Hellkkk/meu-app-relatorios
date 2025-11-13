const xlsx = require('xlsx');
const Purchase = require('../models/Purchase');

// Função auxiliar para normalizar cabeçalhos
function normalizeHeader(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim();
}

// Função auxiliar para converter números PT-BR para formato numérico
function parseNumberBR(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const str = String(value).trim();
  if (str === '') return 0;
  
  // Remove pontos de milhar e substitui vírgula por ponto
  const normalized = str.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  
  return isNaN(num) ? 0 : num;
}

// Função auxiliar para converter datas
function parseDate(value) {
  if (!value) return new Date();
  
  // Se já é um objeto Date
  if (value instanceof Date) return value;
  
  // Se é um número (formato Excel serial date)
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 86400000);
  }
  
  // Se é string no formato dd/mm/aaaa
  const str = String(value).trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Mês é zero-indexed
    const year = parseInt(parts[2]);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  // Fallback: tentar parsing padrão
  const date = new Date(value);
  return isNaN(date.getTime()) ? new Date() : date;
}

// Upload e processamento de planilha Excel
exports.uploadExcel = async (req, res) => {
  try {
    // Verificar se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo foi enviado'
      });
    }

    const mode = req.body.mode || 'append'; // append ou replace
    const source = req.body.source || req.file.originalname;

    // Se mode=replace, deletar registros com o mesmo source_filename
    if (mode === 'replace' && source) {
      await Purchase.deleteMany({ source_filename: source });
    }

    // Ler o arquivo Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    
    // Pegar a primeira aba
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Converter para JSON
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A planilha está vazia'
      });
    }

    // Mapear colunas comuns (normalizar cabeçalhos)
    const purchases = rawData.map(row => {
      // Criar objeto com cabeçalhos normalizados
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        normalizedRow[normalizeHeader(key)] = row[key];
      });

      // Mapear campos conhecidos
      const purchase = {
        fornecedor: normalizedRow.fornecedor || normalizedRow.supplier || normalizedRow.vendedor || '',
        cfop: normalizedRow.cfop || '',
        numero_nfe: normalizedRow.numero_nfe || normalizedRow.nfe || normalizedRow.nota || normalizedRow.numero || '',
        data_compra: parseDate(normalizedRow.data_compra || normalizedRow.data || normalizedRow.date),
        valor_total: parseNumberBR(normalizedRow.valor_total || normalizedRow.total || normalizedRow.valor || 0),
        icms: parseNumberBR(normalizedRow.icms || 0),
        ipi: parseNumberBR(normalizedRow.ipi || 0),
        cofins: parseNumberBR(normalizedRow.cofins || 0),
        bruto: parseNumberBR(normalizedRow.bruto || normalizedRow.valor_bruto || 0),
        source_filename: source,
        imported_at: new Date()
      };

      // Armazenar dados não mapeados em outras_info
      const knownFields = ['fornecedor', 'supplier', 'vendedor', 'cfop', 'numero_nfe', 'nfe', 'nota', 'numero',
                          'data_compra', 'data', 'date', 'valor_total', 'total', 'valor',
                          'icms', 'ipi', 'cofins', 'bruto', 'valor_bruto'];
      
      const otherInfo = {};
      Object.keys(normalizedRow).forEach(key => {
        if (!knownFields.includes(key)) {
          otherInfo[key] = normalizedRow[key];
        }
      });
      
      if (Object.keys(otherInfo).length > 0) {
        purchase.outras_info = otherInfo;
      }

      return purchase;
    });

    // Inserir no banco de dados
    const result = await Purchase.insertMany(purchases);

    res.json({
      success: true,
      imported: result.length,
      mode,
      source
    });

  } catch (error) {
    console.error('Erro ao processar planilha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar planilha',
      error: error.message
    });
  }
};

// Listar compras com paginação e filtros
exports.listPurchases = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Construir filtros
    const filter = {};
    
    // Busca textual
    if (req.query.q) {
      filter.$or = [
        { fornecedor: { $regex: req.query.q, $options: 'i' } },
        { cfop: { $regex: req.query.q, $options: 'i' } },
        { numero_nfe: { $regex: req.query.q, $options: 'i' } }
      ];
    }
    
    // Filtro por fornecedor
    if (req.query.fornecedor) {
      filter.fornecedor = { $regex: req.query.fornecedor, $options: 'i' };
    }
    
    // Filtro por CFOP
    if (req.query.cfop) {
      filter.cfop = req.query.cfop;
    }
    
    // Contar total de registros
    const total = await Purchase.countDocuments(filter);
    
    // Buscar registros com paginação
    const purchases = await Purchase.find(filter)
      .sort({ data_compra: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    res.json({
      success: true,
      data: {
        purchases,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar compras:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar compras',
      error: error.message
    });
  }
};
