import React, { useState, useEffect } from 'react';
import { Paper, Typography, TextField, Box, CircularProgress, Chip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import http from '../../api/http';
import TableDebugWrapper from '../common/TableDebugWrapper';
import { safeNumberBR, formatCurrencyBR, detectMissing } from '../../utils/safeNumberBR';
import { 
  getDateValue, 
  getEntityValue, 
  getNfeValue, 
  getCfopValue,
  getSourceFilename,
  getImportDate
} from '../../utils/identificationFallbacks';

const PurchasesTable = ({ refresh, records = null, type = 'purchases', debugEnabled = false }) => {
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  // If records are provided directly, use them instead of fetching
  // Force useDirectRecords based on Array check to avoid any legacy fetch
  const useDirectRecords = Array.isArray(records) && records !== null;

  // Function to format currency using the new safeNumberBR utility
  const formatCurrency = (value) => {
    try {
      return formatCurrencyBR(value);
    } catch (error) {
      console.warn('Error formatting currency:', value, error);
      return 'R$ 0,00';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return '';
    }
  };

  // Safe value accessor for params that may be undefined
  const safeValue = (params) => {
    if (!params) return null;
    return params.value !== undefined ? params.value : null;
  };

  // Safe row accessor for params that may be undefined
  const safeRow = (params) => {
    if (!params || !params.row) return {};
    return params.row;
  };

  // Helper to safely extract values with fallback field mappings
  const getValueWithFallbacks = (row, ...fieldPaths) => {
    for (const fieldPath of fieldPaths) {
      const parts = fieldPath.split('.');
      let value = row;
      
      for (const part of parts) {
        if (value && value[part] !== undefined && value[part] !== null && value[part] !== '') {
          value = value[part];
        } else {
          value = null;
          break;
        }
      }
      
      if (value !== null && value !== undefined && value !== '') {
        return value;
      }
    }
    return null;
  };

  // Helper to render monetary cells with missing value tooltip
  const renderMonetaryCell = (params, ...fieldPaths) => {
    const row = params.row || {};
    const value = getValueWithFallbacks(row, ...fieldPaths);
    const formatted = formatCurrency(value);
    
    // Check if this is a missing value (null/undefined that became 0)
    const isMissing = detectMissing(value, safeNumberBR(value));
    
    // Debug logging for first row in dev mode
    if (debugEnabled && params.api.getRowIndexRelativeToVisibleRows(params.id) === 0) {
      const fieldName = fieldPaths[0].split('.').pop();
      console.log(`[CellRender] ${fieldName}:`, { 
        value, 
        raw: row[fieldPaths[0].split('.')[0]], 
        formatted,
        isMissing 
      });
    }
    
    // Return with tooltip if missing
    if (isMissing) {
      return (
        <span title="Valor ausente (fallback)" style={{ color: '#999', fontStyle: 'italic' }}>
          {formatted}
        </span>
      );
    }
    
    return formatted;
  };

  // Helper to render identification cells with missing value indicator
  const renderIdentificationCell = (params, getValue, fieldName) => {
    const row = params.row || {};
    const value = getValue(row);
    
    // Debug logging for first row in dev mode
    if (debugEnabled && params.api.getRowIndexRelativeToVisibleRows(params.id) === 0) {
      console.log(`[IDDebug] ${fieldName}:`, { 
        value,
        raw: row,
        fieldName
      });
    }
    
    // Return with placeholder if missing
    if (!value || value === '') {
      return (
        <span style={{ color: '#999', fontStyle: 'italic' }}>
          —
        </span>
      );
    }
    
    return value;
  };

  const columns = [
    {
      field: type === 'purchases' ? 'data_compra' : 'data_emissao',
      headerName: type === 'purchases' ? 'Data Compra' : 'Data Emissão',
      width: 120,
      renderCell: (params) => {
        const value = getDateValue(params.row, type);
        
        // Debug logging for first row in dev mode
        if (debugEnabled && params.api.getRowIndexRelativeToVisibleRows(params.id) === 0) {
          console.log(`[IDDebug] Date:`, { 
            value,
            formatted: value ? formatDate(value) : null,
            raw: params.row
          });
        }
        
        if (!value) {
          return <span style={{ color: '#999', fontStyle: 'italic' }}>—</span>;
        }
        
        return formatDate(value);
      },
      valueGetter: (params) => {
        return getDateValue(params.row, type);
      }
    },
    {
      field: type === 'purchases' ? 'fornecedor' : 'cliente',
      headerName: type === 'purchases' ? 'Fornecedor' : 'Cliente',
      width: 200,
      flex: 1,
      renderCell: (params) => renderIdentificationCell(
        params, 
        (row) => getEntityValue(row, type),
        type === 'purchases' ? 'fornecedor' : 'cliente'
      ),
      valueGetter: (params) => {
        return getEntityValue(params.row, type);
      }
    },
    {
      field: 'numero_nfe',
      headerName: 'Nº NFe',
      width: 150,
      renderCell: (params) => renderIdentificationCell(
        params,
        getNfeValue,
        'numero_nfe'
      ),
      valueGetter: (params) => {
        return getNfeValue(params.row);
      }
    },
    {
      field: 'cfop',
      headerName: 'CFOP',
      width: 100,
      renderCell: (params) => renderIdentificationCell(
        params,
        (row) => getCfopValue(row, type),
        'cfop'
      ),
      valueGetter: (params) => {
        return getCfopValue(params.row, type);
      }
    },
    {
      field: 'valor_total',
      headerName: 'Valor Total',
      width: 130,
      renderCell: (params) => renderMonetaryCell(
        params,
        'valor_total',
        'total_de_mercadoria',
        'valor_da_mercadoria',
        'outras_info.valor_total',
        'outras_info.total_de_mercadoria',
        'outras_info.valor_da_mercadoria'
      ),
      valueGetter: (params) => {
        const row = safeRow(params);
        return getValueWithFallbacks(
          row,
          'valor_total',
          'total_de_mercadoria',
          'valor_da_mercadoria',
          'outras_info.valor_total',
          'outras_info.total_de_mercadoria'
        );
      },
      sortComparator: (v1, v2) => safeNumberBR(v1) - safeNumberBR(v2)
    },
    {
      field: 'icms',
      headerName: 'ICMS',
      width: 120,
      renderCell: (params) => renderMonetaryCell(
        params,
        'icms',
        'valor_do_icms',
        'outras_info.icms',
        'outras_info.valor_do_icms'
      ),
      valueGetter: (params) => {
        const row = safeRow(params);
        return getValueWithFallbacks(row, 'icms', 'valor_do_icms', 'outras_info.icms', 'outras_info.valor_do_icms');
      },
      sortComparator: (v1, v2) => safeNumberBR(v1) - safeNumberBR(v2)
    },
    {
      field: 'ipi',
      headerName: 'IPI',
      width: 120,
      renderCell: (params) => renderMonetaryCell(
        params,
        'ipi',
        'valor_do_ipi',
        'outras_info.ipi',
        'outras_info.valor_do_ipi'
      ),
      valueGetter: (params) => {
        const row = safeRow(params);
        return getValueWithFallbacks(row, 'ipi', 'valor_do_ipi', 'outras_info.ipi', 'outras_info.valor_do_ipi');
      },
      sortComparator: (v1, v2) => safeNumberBR(v1) - safeNumberBR(v2)
    },
    {
      field: 'pis',
      headerName: 'PIS',
      width: 120,
      renderCell: (params) => renderMonetaryCell(
        params,
        'pis',
        'valor_do_pis',
        'pis_total',
        'outras_info.pis',
        'outras_info.valor_do_pis',
        'outras_info.pis_total'
      ),
      valueGetter: (params) => {
        const row = safeRow(params);
        return getValueWithFallbacks(row, 'pis', 'valor_do_pis', 'pis_total', 'outras_info.pis', 'outras_info.valor_do_pis', 'outras_info.pis_total');
      },
      sortComparator: (v1, v2) => safeNumberBR(v1) - safeNumberBR(v2)
    },
    {
      field: 'cofins',
      headerName: 'COFINS',
      width: 120,
      renderCell: (params) => renderMonetaryCell(
        params,
        'cofins',
        'valor_do_cofins',
        'cofins_total',
        'outras_info.cofins',
        'outras_info.valor_do_cofins',
        'outras_info.cofins_total'
      ),
      valueGetter: (params) => {
        const row = safeRow(params);
        return getValueWithFallbacks(row, 'cofins', 'valor_do_cofins', 'cofins_total', 'outras_info.cofins', 'outras_info.valor_do_cofins', 'outras_info.cofins_total');
      },
      sortComparator: (v1, v2) => safeNumberBR(v1) - safeNumberBR(v2)
    },
    {
      field: 'bruto',
      headerName: 'Bruto',
      width: 120,
      renderCell: (params) => renderMonetaryCell(
        params,
        'bruto',
        'valor_bruto',
        'vl_bruto',
        'outras_info.bruto',
        'outras_info.valor_bruto',
        'outras_info.vl_bruto'
      ),
      valueGetter: (params) => {
        const row = safeRow(params);
        return getValueWithFallbacks(row, 'bruto', 'valor_bruto', 'vl_bruto', 'outras_info.bruto', 'outras_info.valor_bruto');
      },
      sortComparator: (v1, v2) => safeNumberBR(v1) - safeNumberBR(v2)
    },
    {
      field: 'fonte',
      headerName: 'Fonte',
      width: 150,
      renderCell: (params) => renderIdentificationCell(
        params,
        getSourceFilename,
        'fonte'
      ),
      valueGetter: (params) => {
        return getSourceFilename(params.row);
      }
    },
    {
      field: 'imported_at',
      headerName: 'Data Importação',
      width: 140,
      renderCell: (params) => {
        const value = getImportDate(params.row);
        
        if (!value) {
          return <span style={{ color: '#999', fontStyle: 'italic' }}>—</span>;
        }
        
        return formatDate(value);
      },
      valueGetter: (params) => {
        return getImportDate(params.row);
      }
    }
  ];

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const response = await http.get('/purchases', {
        params: {
          page: paginationModel.page + 1,
          limit: paginationModel.pageSize,
          q: searchQuery
        }
      });

      if (response.data.success) {
        setPurchases(response.data.data.purchases);
        setRowCount(response.data.data.pagination.total);
      }
    } catch (error) {
      console.error('Erro ao carregar compras:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (useDirectRecords) {
      // Use provided records with client-side filtering
      // DO NOT fetch from /purchases endpoint when records are provided
      let filteredRecords = records;
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredRecords = records.filter(record => {
          const entity = getEntityValue(record, type) || '';
          const nfe = getNfeValue(record) || '';
          const cfop = getCfopValue(record, type) || '';
          
          return entity.toLowerCase().includes(query) ||
                 nfe.toLowerCase().includes(query) ||
                 cfop.toLowerCase().includes(query);
        });
      }
      
      setPurchases(filteredRecords);
      setRowCount(filteredRecords.length);
      
      if (debugEnabled) {
        console.log('[PurchasesTable] Using direct records:', {
          totalRecords: records.length,
          filteredRecords: filteredRecords.length,
          searchQuery,
          firstRecord: filteredRecords[0],
          firstRecordKeys: filteredRecords[0] ? Object.keys(filteredRecords[0]) : []
        });
        
        // Log identification fields of first record for debugging
        if (filteredRecords.length > 0) {
          const first = filteredRecords[0];
          console.log('[IDDebug] First record identification fields:', {
            date: getDateValue(first, type),
            entity: getEntityValue(first, type),
            nfe: getNfeValue(first),
            cfop: getCfopValue(first, type)
          });
        }
      }
    } else {
      // Legacy mode: Fetch from server with debounce
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      const timeout = setTimeout(() => {
        fetchPurchases();
      }, 500);

      setSearchTimeout(timeout);

      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [paginationModel, refresh, records, searchQuery, type, useDirectRecords]);

  return (
    <TableDebugWrapper records={purchases} title={type === 'purchases' ? 'Compras' : 'Vendas'} debugEnabled={debugEnabled}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="h6">
            {type === 'purchases' ? 'Tabela de Compras' : 'Tabela de Vendas'}
          </Typography>
          {useDirectRecords && (
            <Chip 
              label="patched" 
              color="success" 
              size="small" 
              sx={{ fontWeight: 'bold' }}
            />
          )}
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Buscar"
            placeholder={type === 'purchases' ? 'Pesquisar por fornecedor, CFOP ou número de NFe' : 'Pesquisar por cliente, CFOP ou número de NFe'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
          />
        </Box>

        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={purchases}
            columns={columns}
            rowCount={rowCount}
            loading={loading}
            pageSizeOptions={[5, 10, 25, 50]}
            paginationModel={paginationModel}
            paginationMode={useDirectRecords ? 'client' : 'server'}
            onPaginationModelChange={setPaginationModel}
            getRowId={(row) => {
              // Try to generate a stable, unique ID with multiple fallbacks
              if (row._id) return row._id;
              if (row.id) return row.id;
              
              // Generate deterministic ID from available fields using utility functions
              const entity = getEntityValue(row, type) || 'unknown';
              const nfe = getNfeValue(row) || 'no-nfe';
              const cfop = getCfopValue(row, type) || 'no-cfop';
              const date = getDateValue(row, type) || 'no-date';
              const valor = row.valor_total || row.total_de_mercadoria || row.outras_info?.valor_total || '0';
              
              // Create a composite key that should be unique for each transaction
              return `${entity}-${nfe}-${cfop}-${date}-${valor}`.replace(/[^a-zA-Z0-9-]/g, '_');
            }}
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>
    </TableDebugWrapper>
  );
};

export default PurchasesTable;
