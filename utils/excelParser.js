const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Função auxiliar para normalizar cabeçalhos (reutilizada de excelSourceLoader.js)
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

// Função auxiliar para converter números PT-BR para formato numérico (reutilizada)
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
  if (cleaned.includes('.') && cleaned.includes(',')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length === 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes('.') && !cleaned.includes(',')) {
    const parts = cleaned.split('.');
    if (parts.length === 2 && parts[1].length === 2) {
      // Mantém como está (formato US decimal)
    } else if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  const num = parseFloat(cleaned);
  const result = isNaN(num) ? 0 : (isNegative ? -Math.abs(num) : num);
  
  return result;
}

// Função auxiliar para converter datas (reutilizada)
function parseDate(value) {
  if (!value) return new Date();
  
  if (value instanceof Date) return value;
  
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 86400000);
  }
  
  const str = String(value).trim();
  
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(\s+\d{1,2}:\d{2}(:\d{2})?)?$/);
  if (slashMatch) {
    let first = parseInt(slashMatch[1]);
    let second = parseInt(slashMatch[2]);
    let year = parseInt(slashMatch[3]);
    
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
    
    let day, month;
    if (first > 12) {
      day = first;
      month = second - 1;
    } else if (second > 12) {
      month = first - 1;
      day = second;
    } else {
      month = first - 1;
      day = second;
    }
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 0 && month <= 11) {
      return new Date(year, month, day);
    }
  }
  
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
  
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1]);
    const month = parseInt(isoMatch[2]) - 1;
    const day = parseInt(isoMatch[3]);
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  const date = new Date(value);
  return isNaN(date.getTime()) ? new Date() : date;
}

// Aliases para Compras (Purchases)
const HEADER_ALIASES_PURCHASES = {
  fornecedor: [
    'fornecedor', 'supplier', 'vendedor', 'emitente', 'razao_social', 
    'razao_social_fornecedor', 'nome_fornecedor', 'fornecedorcliente_nome_fantasia',
    'nome_fantasia', 'fornecedor_cliente', 'fornecedor_nome_fantasia',
    'razao_social_emitente', 'nome_fantasia_fornecedor', 'fornecedor_razao_social'
  ],
  cfop: [
    'cfop', 'cfop_de_entrada', 'codigo_cfop', 'cfop_entrada', 
    'cfop_compra', 'cod_cfop', 'codigo_fiscal'
  ],
  numero_nfe: [
    'numero_nfe', 'nfe', 'nota', 'numero', 'numero_nf', 'n_nf', 'n_nfe', 
    'no_nf', 'no_nfe', 'num_nf', 'numero_da_nfe', 'nº_nf_e', 'nº_nfe', 
    'nº_nf', 'nota_fiscal', 'num_nota', 'numero_nota', 'nr_nfe', 'nr_nota',
    'num_nfe', 'nf', 'nfe_numero'
  ],
  data_compra: [
    'data_compra', 'data', 'date', 'data_emissao', 'emissao', 'data_da_emissao',
    'data_entrada', 'data_lancamento', 'dt_emissao', 'dt_entrada',
    'data_de_registro_completa', 'data_registro', 'dt_compra',
    'data_nfe', 'data_nf', 'data_nota', 'dt_nota'
  ],
  valor_total: [
    'valor_total', 'total', 'valor', 'valor_nota', 'valor_da_nota',
    'valor_total_nf', 'valor_total_da_nf', 'valor_total_nfe', 'vl_total',
    'valor_documento', 'valor_total_da_nota', 'total_de_mercadoria',
    'valor_mercadoria', 'total_mercadoria', 'vlr_total', 'valor_nfe'
  ],
  icms: ['icms', 'vl_icms', 'valor_icms', 'valor_do_icms', 'vlr_icms', 'icms_valor'],
  ipi: ['ipi', 'vl_ipi', 'valor_ipi', 'valor_do_ipi', 'vlr_ipi', 'ipi_valor'],
  cofins: ['cofins', 'vl_cofins', 'valor_cofins', 'valor_do_cofins', 'vlr_cofins', 'cofins_valor'],
  pis: ['pis', 'vl_pis', 'valor_pis', 'valor_do_pis', 'vlr_pis', 'pis_valor'],
  bruto: [
    'bruto', 'valor_bruto', 'vl_bruto', 'valor_produtos', 
    'valor_mercadorias', 'valor_bruto_mercadorias', 'vlr_bruto',
    'bruto_mercadoria', 'valor_bruto_produtos'
  ]
};

// Aliases para Vendas (Sales) - mesma estrutura mas com aliases diferentes
const HEADER_ALIASES_SALES = {
  cliente: [
    'cliente', 'customer', 'comprador', 'destinatario', 'razao_social',
    'razao_social_cliente', 'nome_cliente', 'nome_fantasia',
    'cliente_nome_fantasia', 'razao_social_destinatario',
    'nome_fantasia_cliente', 'cliente_razao_social'
  ],
  cfop: [
    'cfop', 'codigo_cfop', 'cfop_saida', 'cfop_de_saida', 
    'cfop_venda', 'cod_cfop', 'codigo_fiscal'
  ],
  numero_nfe: [
    'numero_nfe', 'nfe', 'nota', 'numero', 'numero_nf', 'n_nf', 'n_nfe', 
    'no_nf', 'no_nfe', 'num_nf', 'numero_da_nfe', 'nº_nf_e', 'nº_nfe', 
    'nº_nf', 'nota_fiscal', 'num_nota', 'numero_nota', 'nr_nfe', 'nr_nota',
    'num_nfe', 'nf', 'nfe_numero'
  ],
  data_emissao: [
    'data_emissao', 'data', 'date', 'data_venda', 'emissao', 'data_da_emissao',
    'data_saida', 'data_lancamento', 'dt_emissao', 'dt_saida',
    'data_de_emissao_completa', 'dt_venda',
    'data_nfe', 'data_nf', 'data_nota', 'dt_nota'
  ],
  valor_total: [
    'valor_total', 'total', 'valor', 'valor_nota', 'valor_da_nota',
    'valor_total_nf', 'valor_total_da_nf', 'valor_total_nfe', 'vl_total',
    'valor_documento', 'valor_total_da_nota', 'total_de_mercadoria',
    'valor_mercadoria', 'total_mercadoria', 'vlr_total', 'valor_nfe'
  ],
  icms: ['icms', 'vl_icms', 'valor_icms', 'valor_do_icms', 'vlr_icms', 'icms_valor'],
  ipi: ['ipi', 'vl_ipi', 'valor_ipi', 'valor_do_ipi', 'vlr_ipi', 'ipi_valor'],
  cofins: ['cofins', 'vl_cofins', 'valor_cofins', 'valor_do_cofins', 'vlr_cofins', 'cofins_valor'],
  pis: ['pis', 'vl_pis', 'valor_pis', 'valor_do_pis', 'vlr_pis', 'pis_valor'],
  bruto: [
    'bruto', 'valor_bruto', 'vl_bruto', 'valor_produtos', 
    'valor_mercadorias', 'valor_bruto_mercadorias', 'vlr_bruto',
    'bruto_mercadoria', 'valor_bruto_produtos'
  ]
};

/**
 * Detecta automaticamente a linha de cabeçalho
 */
function detectHeaderRow(rawData, aliases, maxLinesToCheck = 20) {
  if (!rawData || rawData.length === 0) return 0;
  
  const linesToCheck = Math.min(maxLinesToCheck, rawData.length);
  let bestScore = -1;
  let bestRowIndex = 0;
  
  const allAliases = new Set();
  Object.values(aliases).forEach(aliasList => {
    aliasList.forEach(alias => allAliases.add(alias));
  });
  
  for (let i = 0; i < linesToCheck; i++) {
    const row = rawData[i];
    if (!Array.isArray(row)) continue;
    
    let score = 0;
    for (const cell of row) {
      if (!cell) continue;
      const normalized = normalizeHeader(cell);
      if (allAliases.has(normalized)) {
        score += 10;
      } else {
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

/**
 * Mapeia um cabeçalho normalizado para um campo conhecido usando aliases
 */
function mapHeaderToField(normalizedHeader, aliases) {
  for (const [field, fieldAliases] of Object.entries(aliases)) {
    if (fieldAliases.includes(normalizedHeader)) {
      return field;
    }
  }
  return null;
}

/**
 * Constrói objetos de dados a partir do header detectado
 */
function buildRowsFromHeader(rawData, headerRowIndex, aliases) {
  if (!rawData || rawData.length <= headerRowIndex) return [];
  
  const headers = rawData[headerRowIndex];
  const rows = [];
  
  const columnMapping = {};
  const normalizedHeaders = [];
  
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    normalizedHeaders[index] = normalized;
    const field = mapHeaderToField(normalized, aliases);
    if (field) {
      columnMapping[index] = field;
    }
  });
  
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!Array.isArray(row)) continue;
    
    const rowObj = {};
    const unmappedData = {};
    
    row.forEach((cell, index) => {
      const field = columnMapping[index];
      if (field) {
        rowObj[field] = cell;
      } else if (normalizedHeaders[index]) {
        unmappedData[normalizedHeaders[index]] = cell;
      }
    });
    
    if (Object.keys(unmappedData).length > 0) {
      rowObj._unmapped = unmappedData;
    }
    
    // Add source row index for debugging
    rowObj.__sourceRow = i;
    
    rows.push(rowObj);
  }
  
  return rows;
}

/**
 * Valida se uma linha é válida
 */
function isValidRow(rowObj, type) {
  if (!rowObj) return false;
  
  // Para compras, verificar fornecedor; para vendas, verificar cliente
  const entityField = type === 'purchases' ? 'fornecedor' : 'cliente';
  const hasEntity = rowObj[entityField] && String(rowObj[entityField]).trim() !== '';
  const hasNumeroNfe = rowObj.numero_nfe && String(rowObj.numero_nfe).trim() !== '';
  
  if (!hasEntity && !hasNumeroNfe) return false;
  
  const entityStr = String(rowObj[entityField] || '').toLowerCase();
  const invalidKeywords = ['total', 'subtotal', 'soma', 'saldo', 'consolidado'];
  
  for (const keyword of invalidKeywords) {
    if (entityStr.includes(keyword)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Parse Excel file for purchases or sales
 * @param {string} filePath - Caminho absoluto do arquivo Excel
 * @param {string} type - 'purchases' ou 'sales'
 * @param {boolean} debug - Enable debug logging (default: false)
 * @returns {Array} Array de objetos processados
 */
function parseExcelFile(filePath, type = 'purchases', debug = false) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  
  const aliases = type === 'purchases' ? HEADER_ALIASES_PURCHASES : HEADER_ALIASES_SALES;
  
  if (debug || process.env.LOG_LEVEL === 'debug') {
    console.log(`[ExcelParser] Carregando planilha de ${type}: ${filePath}`);
  } else {
    console.log(`Carregando planilha de ${type}: ${filePath}`);
  }
  
  // Ler o arquivo Excel
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  
  // Pegar a primeira aba
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Converter para JSON com header:1 para obter array de arrays
  const rawData = xlsx.utils.sheet_to_json(worksheet, { 
    header: 1, 
    raw: false,
    defval: '' 
  });
  
  if (rawData.length === 0) {
    throw new Error('A planilha está vazia');
  }
  
  // Detectar automaticamente a linha de cabeçalho
  const headerRowIndex = detectHeaderRow(rawData, aliases);
  console.log(`Linha de cabeçalho detectada: ${headerRowIndex}`);
  
  if (debug || process.env.LOG_LEVEL === 'debug') {
    const headers = rawData[headerRowIndex];
    console.log(`[ExcelParser] Headers encontrados:`, headers);
    console.log(`[ExcelParser] Headers normalizados:`, headers.map(h => normalizeHeader(h)));
  }
  
  // Construir objetos de dados a partir do header detectado
  const parsedRows = buildRowsFromHeader(rawData, headerRowIndex, aliases);
  
  if (parsedRows.length === 0) {
    throw new Error('Nenhum dado válido encontrado na planilha');
  }
  
  // Processar e validar cada linha
  const records = [];
  const entityField = type === 'purchases' ? 'fornecedor' : 'cliente';
  const dateField = type === 'purchases' ? 'data_compra' : 'data_emissao';
  
  for (const row of parsedRows) {
    if (!isValidRow(row, type)) {
      continue;
    }
    
    // Canonize all fields - promote everything to root level
    const record = {
      numero_nfe: row.numero_nfe ? String(row.numero_nfe).trim() : '',
      cfop: row.cfop ? String(row.cfop).trim() : '',
      valor_total: parseNumberBR(row.valor_total || 0),
      icms: parseNumberBR(row.icms || 0),
      ipi: parseNumberBR(row.ipi || 0),
      cofins: parseNumberBR(row.cofins || 0),
      pis: parseNumberBR(row.pis || 0),
      bruto: parseNumberBR(row.bruto || 0)
    };
    
    // Campos específicos por tipo
    if (type === 'purchases') {
      record.fornecedor = row.fornecedor ? String(row.fornecedor).trim() : '';
      // Convert date to ISO string only
      const dataCompra = parseDate(row.data_compra);
      record.data_compra = dataCompra.toISOString();
    } else {
      record.cliente = row.cliente ? String(row.cliente).trim() : '';
      // Convert date to ISO string only
      const dataEmissao = parseDate(row.data_emissao);
      record.data_emissao = dataEmissao.toISOString();
    }
    
    // Add source row for debugging (optional)
    if (row.__sourceRow !== undefined) {
      record.__sourceRow = row.__sourceRow;
    }
    
    // Keep unmapped data only if it exists and is not empty
    const otherInfo = row._unmapped || {};
    if (Object.keys(otherInfo).length > 0) {
      record.outras_info = otherInfo;
    }
    
    records.push(record);
  }
  
  if (records.length === 0) {
    throw new Error('Nenhum registro válido encontrado após filtros');
  }
  
  console.log(`${records.length} registros processados da planilha de ${type}`);
  
  // Debug logging for identification fields statistics
  if (debug || process.env.LOG_LEVEL === 'debug') {
    let countWithEntity = 0;
    let countWithDate = 0;
    let countWithNfe = 0;
    let countWithCfop = 0;
    
    records.forEach(record => {
      if (record[entityField] && record[entityField].trim() !== '') countWithEntity++;
      if (record[dateField] && record[dateField].trim() !== '') countWithDate++;
      if (record.numero_nfe && record.numero_nfe.trim() !== '') countWithNfe++;
      if (record.cfop && record.cfop.trim() !== '') countWithCfop++;
    });
    
    console.log(`[ExcelParser] Estatísticas de identificação:`);
    console.log(`  ${entityField}: ${countWithEntity}/${records.length} (${(countWithEntity/records.length*100).toFixed(1)}%)`);
    console.log(`  ${dateField}: ${countWithDate}/${records.length} (${(countWithDate/records.length*100).toFixed(1)}%)`);
    console.log(`  numero_nfe: ${countWithNfe}/${records.length} (${(countWithNfe/records.length*100).toFixed(1)}%)`);
    console.log(`  cfop: ${countWithCfop}/${records.length} (${(countWithCfop/records.length*100).toFixed(1)}%)`);
    
    if (records.length > 0) {
      console.log(`[ExcelParser] Primeiro registro:`, {
        [entityField]: records[0][entityField],
        [dateField]: records[0][dateField],
        numero_nfe: records[0].numero_nfe,
        cfop: records[0].cfop,
        valor_total: records[0].valor_total
      });
    }
  }
  
  return records;
}

module.exports = {
  parseExcelFile,
  normalizeHeader,
  parseNumberBR,
  parseDate
};
