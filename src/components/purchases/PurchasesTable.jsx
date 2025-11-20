import React, { useState, useEffect } from 'react';
import { Paper, Typography, TextField, Box, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import http from '../../api/http';

const PurchasesTable = ({ refresh, records = null, type = 'purchases' }) => {
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
  const useDirectRecords = records !== null;

  // Função para converter valores PT-BR em números
  const toNumberBR = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    const str = String(value).trim();
    if (str === '') return 0;
    
    // Remove prefixos comuns (R$, $), parênteses e espaços
    let cleaned = str
      .replace(/R\$/gi, '')
      .replace(/\$/g, '')
      .replace(/[()]/g, '')
      .replace(/\s+/g, '')
      .trim();
    
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
      if (parts.length === 2 && parts[1].length <= 2) {
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
    return isNaN(num) ? 0 : num;
  };

  const formatCurrency = (value) => {
    try {
      const numValue = toNumberBR(value);
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(numValue);
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

  const columns = [
    {
      field: type === 'purchases' ? 'data_compra' : 'data_emissao',
      headerName: type === 'purchases' ? 'Data Compra' : 'Data Emissão',
      width: 120,
      valueGetter: (params) => {
        const row = safeRow(params);
        return type === 'purchases' 
          ? getValueWithFallbacks(row, 'data_compra', 'outras_info.data_compra')
          : getValueWithFallbacks(row, 'data_emissao', 'outras_info.data_emissao');
      },
      valueFormatter: (params) => {
        const value = safeValue(params);
        return formatDate(value);
      }
    },
    {
      field: type === 'purchases' ? 'fornecedor' : 'cliente',
      headerName: type === 'purchases' ? 'Fornecedor' : 'Cliente',
      width: 200,
      flex: 1,
      valueGetter: (params) => {
        const row = safeRow(params);
        return type === 'purchases'
          ? getValueWithFallbacks(row, 'fornecedor', 'outras_info.fornecedor', 'outras_info.fornecedorcliente_nome_fantasia')
          : getValueWithFallbacks(row, 'cliente', 'outras_info.cliente', 'outras_info.cliente_nome_fantasia');
      }
    },
    {
      field: 'numero_nfe',
      headerName: 'Nº NFe',
      width: 150,
      valueGetter: (params) => {
        const row = safeRow(params);
        return getValueWithFallbacks(row, 'numero_nfe', 'outras_info.numero_nfe');
      }
    },
    {
      field: 'cfop',
      headerName: 'CFOP',
      width: 100,
      valueGetter: (params) => {
        const row = safeRow(params);
        return getValueWithFallbacks(row, 'cfop', 'outras_info.cfop');
      }
    },
    {
      field: 'valor_total',
      headerName: 'Valor Total',
      width: 130,
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
      valueFormatter: (params) => {
        const value = safeValue(params);
        return formatCurrency(value);
      },
      sortComparator: (v1, v2) => toNumberBR(v1) - toNumberBR(v2)
    },
    {
      field: 'icms',
      headerName: 'ICMS',
      width: 120,
      valueGetter: (params) => {
        const row = safeRow(params);
        return getValueWithFallbacks(row, 'icms', 'valor_do_icms', 'outras_info.valor_do_icms');
      },
      valueFormatter: (params) => {
        const value = safeValue(params);
        return formatCurrency(value);
      },
      sortComparator: (v1, v2) => toNumberBR(v1) - toNumberBR(v2)
    },
    {
      field: 'ipi',
      headerName: 'IPI',
      width: 120,
      valueGetter: (params) => {
        const row = safeRow(params);
        return getValueWithFallbacks(row, 'ipi', 'valor_do_ipi', 'outras_info.valor_do_ipi');
      },
      valueFormatter: (params) => {
        const value = safeValue(params);
        return formatCurrency(value);
      },
      sortComparator: (v1, v2) => toNumberBR(v1) - toNumberBR(v2)
    },
    {
      field: 'pis',
      headerName: 'PIS',
      width: 120,
      valueGetter: (params) => {
        const row = safeRow(params);
        return getValueWithFallbacks(row, 'pis', 'valor_do_pis', 'outras_info.pis', 'outras_info.valor_do_pis');
      },
      valueFormatter: (params) => {
        const value = safeValue(params);
        return formatCurrency(value);
      },
      sortComparator: (v1, v2) => toNumberBR(v1) - toNumberBR(v2)
    },
    {
      field: 'cofins',
      headerName: 'COFINS',
      width: 120,
      valueGetter: (params) => {
        const row = safeRow(params);
        return getValueWithFallbacks(row, 'cofins', 'valor_do_cofins', 'outras_info.valor_do_cofins');
      },
      valueFormatter: (params) => {
        const value = safeValue(params);
        return formatCurrency(value);
      },
      sortComparator: (v1, v2) => toNumberBR(v1) - toNumberBR(v2)
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
      let filteredRecords = records;
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredRecords = records.filter(record => {
          const entity = type === 'purchases' 
            ? (record.fornecedor || record.outras_info?.fornecedor || '')
            : (record.cliente || record.outras_info?.cliente || '');
          const nfe = record.numero_nfe || record.outras_info?.numero_nfe || '';
          const cfop = record.cfop || record.outras_info?.cfop || '';
          
          return entity.toLowerCase().includes(query) ||
                 nfe.toLowerCase().includes(query) ||
                 cfop.toLowerCase().includes(query);
        });
      }
      
      setPurchases(filteredRecords);
      setRowCount(filteredRecords.length);
    } else {
      // Fetch from server with debounce handled here
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
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {type === 'purchases' ? 'Tabela de Compras' : 'Tabela de Vendas'}
      </Typography>

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
            
            // Generate deterministic ID from available fields
            const entity = row.fornecedor || row.cliente || row.outras_info?.fornecedor || row.outras_info?.cliente || 'unknown';
            const nfe = row.numero_nfe || row.outras_info?.numero_nfe || 'no-nfe';
            const cfop = row.cfop || row.outras_info?.cfop || 'no-cfop';
            const date = row.data_compra || row.data_emissao || row.outras_info?.data_compra || row.outras_info?.data_emissao || 'no-date';
            const valor = row.valor_total || row.total_de_mercadoria || row.outras_info?.valor_total || '0';
            
            // Create a composite key that should be unique for each transaction
            return `${entity}-${nfe}-${cfop}-${date}-${valor}`.replace(/[^a-zA-Z0-9-]/g, '_');
          }}
          disableRowSelectionOnClick
        />
      </Box>
    </Paper>
  );
};

export default PurchasesTable;
