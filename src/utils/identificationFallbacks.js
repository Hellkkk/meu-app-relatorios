/**
 * Utility functions for extracting identification fields from records
 * with comprehensive fallback logic for different spreadsheet formats
 */

/**
 * Helper to safely extract values with fallback field mappings
 * @param {Object} row - The data row
 * @param {...string} fieldPaths - Field paths to try (e.g., 'data_compra', 'outras_info.data_compra')
 * @returns {*} The first non-empty value found, or null
 */
export const getValueWithFallbacks = (row, ...fieldPaths) => {
  if (!row) return null;
  
  for (const fieldPath of fieldPaths) {
    const parts = fieldPath.split('.');
    let value = row;
    
    for (const part of parts) {
      if (value && value[part] !== undefined && value[part] !== null) {
        value = value[part];
      } else {
        value = null;
        break;
      }
    }
    
    // Check if value is non-empty
    if (value !== null && value !== undefined) {
      // For strings, check if it's not just whitespace
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed !== '') {
          return trimmed;
        }
      } else {
        // For non-strings (numbers, dates, objects), return as-is
        return value;
      }
    }
  }
  
  return null;
};

/**
 * Get date value from record with fallbacks
 * @param {Object} row - The data row
 * @param {string} type - 'purchases' or 'sales'
 * @returns {string|null} ISO date string or null
 */
export const getDateValue = (row, type = 'purchases') => {
  if (type === 'purchases') {
    return getValueWithFallbacks(
      row,
      'data_compra',
      'data_emissao',
      'data',
      'data_entrada',
      'data_lancamento',
      'dt_emissao',
      'dt_entrada',
      'data_de_registro_completa',
      'data_registro',
      'outras_info.data_compra',
      'outras_info.data_emissao',
      'outras_info.data'
    );
  } else {
    return getValueWithFallbacks(
      row,
      'data_emissao',
      'data_compra',
      'data',
      'data_venda',
      'emissao',
      'data_saida',
      'data_lancamento',
      'dt_emissao',
      'dt_saida',
      'data_de_emissao_completa',
      'outras_info.data_emissao',
      'outras_info.data_venda',
      'outras_info.data'
    );
  }
};

/**
 * Get entity (supplier/customer) value from record with fallbacks
 * @param {Object} row - The data row
 * @param {string} type - 'purchases' or 'sales'
 * @returns {string|null} Entity name or null
 */
export const getEntityValue = (row, type = 'purchases') => {
  if (type === 'purchases') {
    return getValueWithFallbacks(
      row,
      'fornecedor',
      'supplier',
      'vendedor',
      'emitente',
      'razao_social',
      'razao_social_fornecedor',
      'nome_fornecedor',
      'fornecedorcliente_nome_fantasia',
      'nome_fantasia',
      'fornecedor_cliente',
      'razao_social_emitente',
      'outras_info.fornecedor',
      'outras_info.fornecedorcliente_nome_fantasia',
      'outras_info.razao_social',
      'outras_info.nome_fantasia'
    );
  } else {
    return getValueWithFallbacks(
      row,
      'cliente',
      'customer',
      'comprador',
      'destinatario',
      'razao_social',
      'razao_social_cliente',
      'nome_cliente',
      'cliente_nome_fantasia',
      'nome_fantasia',
      'razao_social_destinatario',
      'outras_info.cliente',
      'outras_info.cliente_nome_fantasia',
      'outras_info.razao_social',
      'outras_info.nome_fantasia'
    );
  }
};

/**
 * Get NFe number from record with fallbacks
 * @param {Object} row - The data row
 * @returns {string|null} NFe number or null
 */
export const getNfeValue = (row) => {
  return getValueWithFallbacks(
    row,
    'numero_nfe',
    'nfe',
    'nota',
    'numero',
    'numero_nf',
    'n_nf',
    'n_nfe',
    'no_nf',
    'no_nfe',
    'num_nf',
    'numero_da_nfe',
    'nº_nf_e',
    'nº_nfe',
    'nº_nf',
    'nota_fiscal',
    'num_nota',
    'numero_nota',
    'outras_info.numero_nfe',
    'outras_info.nfe',
    'outras_info.numero_nf'
  );
};

/**
 * Get CFOP from record with fallbacks
 * @param {Object} row - The data row
 * @param {string} type - 'purchases' or 'sales'
 * @returns {string|null} CFOP code or null
 */
export const getCfopValue = (row, type = 'purchases') => {
  const cfopValue = getValueWithFallbacks(
    row,
    'cfop',
    'codigo_cfop',
    type === 'purchases' ? 'cfop_de_entrada' : 'cfop_saida',
    type === 'purchases' ? 'cfop_entrada' : 'cfop_de_saida',
    'cfop_venda',
    'cfop_compra',
    'outras_info.cfop',
    'outras_info.codigo_cfop'
  );
  
  // Extract just the numeric code if it's in format "5.101 - Description" or "5101"
  if (cfopValue && typeof cfopValue === 'string') {
    // Match formats like "5.101" or "5101" at the start of the string
    const match = cfopValue.match(/^(\d+\.?\d*)/);
    if (match) {
      return match[1];
    }
  }
  
  return cfopValue;
};

/**
 * Get source filename from record with fallbacks
 * @param {Object} row - The data row
 * @returns {string|null} Source filename or null
 */
export const getSourceFilename = (row) => {
  return getValueWithFallbacks(
    row,
    'source_filename',
    'origem',
    'fonte',
    'arquivo',
    'nome_arquivo',
    'outras_info.source_filename',
    'outras_info.origem',
    'outras_info.fonte'
  );
};

/**
 * Get import date from record with fallbacks
 * @param {Object} row - The data row
 * @returns {string|null} Import date or null
 */
export const getImportDate = (row) => {
  return getValueWithFallbacks(
    row,
    'imported_at',
    'data_importacao',
    'data_import',
    'importado_em',
    'outras_info.imported_at',
    'outras_info.data_importacao'
  );
};
