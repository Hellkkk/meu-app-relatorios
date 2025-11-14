const xlsx = require('xlsx');
const Purchase = require('../models/Purchase');

// Função auxiliar para normalizar cabeçalhos
// Remove acentos, converte para minúsculas, remove símbolos e colapsa underscores
function normalizeHeader(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[º°.\/\-()]/g, '') // Remove símbolos comuns: º ° . / - ( )
    .replace(/\s+/g, '_') // Substitui espaços por underscores
    .replace(/_+/g, '_') // Colapsa múltiplos underscores em um
    .replace(/^_|_$/g, '') // Remove underscores no início e fim
    .trim();
}

// Função auxiliar para converter números PT-BR para formato numérico
// Suporta ambos os formatos:
// - PT-BR: "R$ 1.234,56" (ponto=milhar, vírgula=decimal)
// - US/Excel: "R$ 1,234.56" (vírgula=milhar, ponto=decimal)
function parseNumberBR(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const str = String(value).trim();
  if (str === '') return 0;
  
  // Remove prefixos comuns (R$, $), parênteses e espaços
  let cleaned = str
    .replace(/^R\$\s*/i, '')
    .replace(/^\$\s*/, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, '')
    .trim();
  
  // Trata números negativos entre parênteses
  const isNegative = str.includes('(') && str.includes(')');
  
  // Detectar o formato baseado na estrutura:
  // Se contém tanto ponto quanto vírgula, determinar qual é decimal
  if (cleaned.includes('.') && cleaned.includes(',')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    // Se o último separador é vírgula, formato PT-BR (1.234,56)
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    // Se o último separador é ponto, formato US (1,234.56)
    else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  // Se contém apenas vírgula
  else if (cleaned.includes(',') && !cleaned.includes('.')) {
    // Verificar se é milhar ou decimal
    const parts = cleaned.split(',');
    // Se a parte após a vírgula tem exatamente 2 dígitos, é decimal PT-BR
    if (parts.length === 2 && parts[1].length === 2) {
      cleaned = cleaned.replace(',', '.');
    }
    // Se tem 3 dígitos ou múltiplas vírgulas, é milhar US
    else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  // Se contém apenas ponto
  else if (cleaned.includes('.') && !cleaned.includes(',')) {
    // Verificar se é milhar ou decimal
    const parts = cleaned.split('.');
    // Se a parte após o ponto tem exatamente 2 dígitos, é decimal US
    if (parts.length === 2 && parts[1].length === 2) {
      // Mantém como está (formato US decimal)
    }
    // Se tem 3 dígitos ou múltiplos pontos, é milhar PT-BR
    else if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  const num = parseFloat(cleaned);
  const result = isNaN(num) ? 0 : (isNegative ? -Math.abs(num) : num);
  
  return result;
}

// Função auxiliar para converter datas
// Suporta: Date, Excel serial, dd/mm/aaaa, dd-mm-aaaa, yyyy-mm-dd, MM/DD/YY, etc.
function parseDate(value) {
  if (!value) return new Date();
  
  // Se já é um objeto Date
  if (value instanceof Date) return value;
  
  // Se é um número (formato Excel serial date)
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 86400000);
  }
  
  // Se é string, tentar vários formatos
  const str = String(value).trim();
  
  // Formato dd/mm/yyyy ou dd/mm/yy (com opcionais hh:mm:ss)
  const ddmmyyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(\s+\d{1,2}:\d{2}(:\d{2})?)?$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1]);
    const month = parseInt(ddmmyyyyMatch[2]) - 1;
    let year = parseInt(ddmmyyyyMatch[3]);
    
    // Se ano tem 2 dígitos, assumir 20xx se < 50, senão 19xx
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  // Formato MM/DD/YY ou MM/DD/YYYY (formato americano comum em Excel)
  const mmddyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mmddyyMatch) {
    const month = parseInt(mmddyyMatch[1]) - 1;
    const day = parseInt(mmddyyMatch[2]);
    let year = parseInt(mmddyyMatch[3]);
    
    // Se ano tem 2 dígitos, assumir 20xx se < 50, senão 19xx
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
    
    // Heurística: se dia > 12, então formato é dd/mm, senão pode ser mm/dd
    // Para valores ambíguos, tentamos ambos os formatos
    if (day > 12) {
      // Definitivamente dd/mm/yyyy
      return new Date(year, month, day);
    } else if (month > 11) {
      // month inválido como mês, deve ser dd/mm/yyyy
      return new Date(year, day, month);
    } else {
      // Ambíguo: preferir MM/DD/YYYY (formato americano comum em Excel)
      return new Date(year, month, day);
    }
  }
  
  // Formato dd-mm-yyyy ou dd-mm-yy
  const ddmmyyyyDashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (ddmmyyyyDashMatch) {
    const day = parseInt(ddmmyyyyDashMatch[1]);
    const month = parseInt(ddmmyyyyDashMatch[2]) - 1;
    let year = parseInt(ddmmyyyyDashMatch[3]);
    
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  // Formato ISO yyyy-mm-dd[Thh:mm:ss]
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1]);
    const month = parseInt(isoMatch[2]) - 1;
    const day = parseInt(isoMatch[3]);
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  // Fallback: tentar parsing padrão do JavaScript
  const date = new Date(value);
  return isNaN(date.getTime()) ? new Date() : date;
}

// Mapeamento de aliases para cada campo conhecido
const FIELD_ALIASES = {
  fornecedor: [
    'fornecedor', 'supplier', 'vendedor', 'emitente', 'razao_social', 
    'razao_social_fornecedor', 'nome_fornecedor', 'fornecedorcliente_nome_fantasia',
    'nome_fantasia', 'cliente', 'fornecedor_cliente'
  ],
  cfop: ['cfop', 'cfop_de_entrada', 'codigo_cfop'],
  numero_nfe: [
    'numero_nfe', 'nfe', 'nota', 'numero', 'numero_nf', 'n_nf', 'n_nfe', 
    'no_nf', 'no_nfe', 'num_nf', 'numero_da_nfe', 'nº_nf_e', 'nº_nfe', 
    'nº_nf', 'nota_fiscal', 'num_nota', 'numero_nota'
  ],
  data_compra: [
    'data_compra', 'data', 'date', 'data_emissao', 'emissao', 'data_da_emissao',
    'data_entrada', 'data_lancamento', 'dt_emissao', 'dt_entrada',
    'data_de_registro_completa', 'data_registro'
  ],
  valor_total: [
    'valor_total', 'total', 'valor', 'valor_nota', 'valor_da_nota',
    'valor_total_nf', 'valor_total_da_nf', 'valor_total_nfe', 'vl_total',
    'valor_documento', 'valor_total_da_nota', 'total_de_mercadoria',
    'valor_mercadoria', 'total_mercadoria'
  ],
  icms: ['icms', 'vl_icms', 'valor_icms', 'valor_do_icms'],
  ipi: ['ipi', 'vl_ipi', 'valor_ipi', 'valor_do_ipi'],
  cofins: ['cofins', 'vl_cofins', 'valor_cofins', 'valor_do_cofins'],
  pis: ['pis', 'vl_pis', 'valor_pis', 'valor_do_pis'], // Adicionar PIS
  bruto: [
    'bruto', 'valor_bruto', 'vl_bruto', 'valor_produtos', 
    'valor_mercadorias', 'valor_bruto_mercadorias'
  ]
};

// Função para detectar a linha de cabeçalho automaticamente
// Analisa as primeiras N linhas e pontua qual contém mais aliases conhecidos
function detectHeaderRow(rawData, maxLinesToCheck = 20) {
  if (!rawData || rawData.length === 0) return 0;
  
  const linesToCheck = Math.min(maxLinesToCheck, rawData.length);
  let bestScore = -1;
  let bestRowIndex = 0;
  
  // Criar um set de todos os aliases possíveis para busca rápida
  const allAliases = new Set();
  Object.values(FIELD_ALIASES).forEach(aliases => {
    aliases.forEach(alias => allAliases.add(alias));
  });
  
  for (let i = 0; i < linesToCheck; i++) {
    const row = rawData[i];
    if (!Array.isArray(row)) continue;
    
    let score = 0;
    for (const cell of row) {
      if (!cell) continue;
      const normalized = normalizeHeader(cell);
      if (allAliases.has(normalized)) {
        score += 10; // Match exato
      } else {
        // Pontos parciais para matches parciais
        for (const alias of allAliases) {
          if (normalized.includes(alias) || alias.includes(normalized)) {
            score += 3;
            break;
          }
        }
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestRowIndex = i;
    }
  }
  
  return bestRowIndex;
}

// Função para mapear um cabeçalho normalizado para um campo conhecido
function mapHeaderToField(normalizedHeader) {
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(normalizedHeader)) {
      return field;
    }
  }
  return null;
}

// Função para construir objetos de dados a partir do header detectado
function buildRowsFromHeader(rawData, headerRowIndex) {
  if (!rawData || rawData.length <= headerRowIndex) return [];
  
  const headers = rawData[headerRowIndex];
  const rows = [];
  
  // Mapear índices de colunas para campos conhecidos
  const columnMapping = {};
  const normalizedHeaders = [];
  
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    normalizedHeaders[index] = normalized;
    const field = mapHeaderToField(normalized);
    if (field) {
      columnMapping[index] = field;
    }
  });
  
  // Processar linhas de dados (após o header)
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!Array.isArray(row)) continue;
    
    // Criar objeto de linha
    const rowObj = {};
    const unmappedData = {};
    
    row.forEach((cell, index) => {
      const field = columnMapping[index];
      if (field) {
        rowObj[field] = cell;
      } else if (normalizedHeaders[index]) {
        // Armazenar dados não mapeados com cabeçalho normalizado
        unmappedData[normalizedHeaders[index]] = cell;
      }
    });
    
    // Adicionar dados não mapeados
    if (Object.keys(unmappedData).length > 0) {
      rowObj._unmapped = unmappedData;
    }
    
    rows.push(rowObj);
  }
  
  return rows;
}

// Função para validar se uma linha é válida (não é totalização/rodapé)
function isValidRow(rowObj) {
  // Ignorar linhas vazias ou sem dados críticos
  if (!rowObj) return false;
  
  // Deve ter pelo menos fornecedor OU número de nota
  const hasFornecedor = rowObj.fornecedor && String(rowObj.fornecedor).trim() !== '';
  const hasNumeroNfe = rowObj.numero_nfe && String(rowObj.numero_nfe).trim() !== '';
  
  if (!hasFornecedor && !hasNumeroNfe) return false;
  
  // Heurística: linhas de totalização geralmente têm palavras como "total", "subtotal", "soma"
  const fornecedorStr = String(rowObj.fornecedor || '').toLowerCase();
  const invalidKeywords = ['total', 'subtotal', 'soma', 'saldo', 'consolidado'];
  
  for (const keyword of invalidKeywords) {
    if (fornecedorStr.includes(keyword)) {
      return false;
    }
  }
  
  return true;
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
    
    // Converter para JSON com header:1 para obter array de arrays (raw rows)
    const rawData = xlsx.utils.sheet_to_json(worksheet, { 
      header: 1, 
      raw: false, // Manter valores como strings para melhor parsing
      defval: '' 
    });

    if (rawData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A planilha está vazia'
      });
    }

    // Detectar automaticamente a linha de cabeçalho
    const headerRowIndex = detectHeaderRow(rawData);
    
    // Construir objetos de dados a partir do header detectado
    const parsedRows = buildRowsFromHeader(rawData, headerRowIndex);

    if (parsedRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum dado válido encontrado na planilha'
      });
    }

    // Processar e validar cada linha
    const purchases = [];
    
    for (const row of parsedRows) {
      // Validar se a linha é válida (não é totalização/rodapé)
      if (!isValidRow(row)) {
        continue;
      }

      // Criar objeto purchase com campos mapeados
      const purchase = {
        fornecedor: row.fornecedor ? String(row.fornecedor).trim() : '',
        cfop: row.cfop ? String(row.cfop).trim() : '',
        numero_nfe: row.numero_nfe ? String(row.numero_nfe).trim() : '',
        data_compra: parseDate(row.data_compra),
        valor_total: parseNumberBR(row.valor_total || 0),
        icms: parseNumberBR(row.icms || 0),
        ipi: parseNumberBR(row.ipi || 0),
        cofins: parseNumberBR(row.cofins || 0),
        bruto: parseNumberBR(row.bruto || 0),
        source_filename: source,
        imported_at: new Date()
      };

      // Se PIS foi mapeado mas não temos campo para ele, adicionar em outras_info
      const otherInfo = row._unmapped || {};
      if (row.pis && parseNumberBR(row.pis) > 0) {
        otherInfo.pis = parseNumberBR(row.pis);
      }
      
      // Adicionar dados não mapeados a outras_info
      if (Object.keys(otherInfo).length > 0) {
        purchase.outras_info = otherInfo;
      }

      purchases.push(purchase);
    }

    if (purchases.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum registro válido encontrado após filtros'
      });
    }

    // Inserir no banco de dados
    const result = await Purchase.insertMany(purchases);

    res.json({
      success: true,
      imported: result.length,
      mode,
      source,
      headerRowDetected: headerRowIndex
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
