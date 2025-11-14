const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
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

// Função auxiliar para converter datas
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
  pis: ['pis', 'vl_pis', 'valor_pis', 'valor_do_pis'],
  bruto: [
    'bruto', 'valor_bruto', 'vl_bruto', 'valor_produtos', 
    'valor_mercadorias', 'valor_bruto_mercadorias'
  ]
};

// Função para detectar a linha de cabeçalho automaticamente
function detectHeaderRow(rawData, maxLinesToCheck = 20) {
  if (!rawData || rawData.length === 0) return 0;
  
  const linesToCheck = Math.min(maxLinesToCheck, rawData.length);
  let bestScore = -1;
  let bestRowIndex = 0;
  
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
    
    rows.push(rowObj);
  }
  
  return rows;
}

// Função para validar se uma linha é válida
function isValidRow(rowObj) {
  if (!rowObj) return false;
  
  const hasFornecedor = rowObj.fornecedor && String(rowObj.fornecedor).trim() !== '';
  const hasNumeroNfe = rowObj.numero_nfe && String(rowObj.numero_nfe).trim() !== '';
  
  if (!hasFornecedor && !hasNumeroNfe) return false;
  
  const fornecedorStr = String(rowObj.fornecedor || '').toLowerCase();
  const invalidKeywords = ['total', 'subtotal', 'soma', 'saldo', 'consolidado'];
  
  for (const keyword of invalidKeywords) {
    if (fornecedorStr.includes(keyword)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Localiza a planilha Excel no repositório
 * @returns {string} Caminho absoluto da planilha
 * @throws {Error} Se a planilha não for encontrada
 */
function locateExcelFile() {
  const projectRoot = path.resolve(__dirname, '..');
  
  // Caminho configurável via variável de ambiente
  if (process.env.EXCEL_SOURCE_PATH) {
    const configuredPath = path.isAbsolute(process.env.EXCEL_SOURCE_PATH)
      ? process.env.EXCEL_SOURCE_PATH
      : path.resolve(projectRoot, process.env.EXCEL_SOURCE_PATH);
    
    if (fs.existsSync(configuredPath)) {
      return configuredPath;
    }
    throw new Error(`Planilha não encontrada no caminho configurado: ${configuredPath}`);
  }
  
  // Caminhos de fallback
  const fallbackPaths = [
    path.resolve(projectRoot, 'Compras_AVM.xlsx'),
    path.resolve(projectRoot, 'data/Compras_AVM.xlsx'),
    path.resolve(projectRoot, 'assets/Compras_AVM.xlsx'),
    path.resolve(projectRoot, 'public/Compras_AVM.xlsx')
  ];
  
  for (const filePath of fallbackPaths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  
  throw new Error(
    `Planilha Compras_AVM.xlsx não encontrada. Procurado em:\n${fallbackPaths.join('\n')}\n\n` +
    `Configure EXCEL_SOURCE_PATH para especificar o caminho correto.`
  );
}

/**
 * Lê e processa a planilha do repositório
 * @returns {Array} Array de objetos purchase prontos para inserção
 */
function loadPurchasesFromExcel() {
  const filePath = locateExcelFile();
  
  console.log(`Carregando planilha de: ${filePath}`);
  
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
  const headerRowIndex = detectHeaderRow(rawData);
  console.log(`Linha de cabeçalho detectada: ${headerRowIndex}`);
  
  // Construir objetos de dados a partir do header detectado
  const parsedRows = buildRowsFromHeader(rawData, headerRowIndex);
  
  if (parsedRows.length === 0) {
    throw new Error('Nenhum dado válido encontrado na planilha');
  }
  
  // Processar e validar cada linha
  const purchases = [];
  
  for (const row of parsedRows) {
    if (!isValidRow(row)) {
      continue;
    }
    
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
      source_filename: 'Repo-Compras-AVM',
      imported_at: new Date()
    };
    
    const otherInfo = row._unmapped || {};
    if (row.pis && parseNumberBR(row.pis) > 0) {
      otherInfo.pis = parseNumberBR(row.pis);
    }
    
    if (Object.keys(otherInfo).length > 0) {
      purchase.outras_info = otherInfo;
    }
    
    purchases.push(purchase);
  }
  
  if (purchases.length === 0) {
    throw new Error('Nenhum registro válido encontrado após filtros');
  }
  
  console.log(`${purchases.length} registros processados da planilha`);
  
  return purchases;
}

/**
 * Importa purchases do arquivo Excel do repositório para o banco de dados
 * @param {Object} options - Opções de importação
 * @param {string} options.mode - 'replace' ou 'append' (default: 'replace')
 * @param {string} options.source - Nome da fonte (default: 'Repo-Compras-AVM')
 * @returns {Promise<Object>} Resultado da importação
 */
async function importPurchasesFromRepoSource(options = {}) {
  const { mode = 'replace', source = 'Repo-Compras-AVM' } = options;
  
  try {
    // Carregar dados da planilha
    const purchases = loadPurchasesFromExcel();
    
    // Se mode=replace, deletar registros existentes com o mesmo source_filename
    if (mode === 'replace') {
      const deleteResult = await Purchase.deleteMany({ source_filename: source });
      console.log(`Modo replace: ${deleteResult.deletedCount} registros anteriores removidos`);
    }
    
    // Inserir no banco de dados
    const result = await Purchase.insertMany(purchases);
    
    console.log(`Importação concluída: ${result.length} registros inseridos`);
    
    return {
      success: true,
      imported: result.length,
      mode,
      source
    };
  } catch (error) {
    console.error('Erro ao importar purchases do repositório:', error);
    throw error;
  }
}

module.exports = {
  locateExcelFile,
  loadPurchasesFromExcel,
  importPurchasesFromRepoSource
};
