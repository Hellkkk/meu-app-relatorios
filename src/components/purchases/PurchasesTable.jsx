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

  const columns = [
    {
      field: type === 'purchases' ? 'data_compra' : 'data_emissao',
      headerName: type === 'purchases' ? 'Data Compra' : 'Data Emissão',
      width: 120,
      valueFormatter: (params) => {
        const value = safeValue(params);
        return formatDate(value);
      }
    },
    {
      field: type === 'purchases' ? 'fornecedor' : 'cliente',
      headerName: type === 'purchases' ? 'Fornecedor' : 'Cliente',
      width: 200,
      flex: 1
    },
    {
      field: 'numero_nfe',
      headerName: 'Nº NFe',
      width: 150
    },
    {
      field: 'cfop',
      headerName: 'CFOP',
      width: 100
    },
    {
      field: 'valor_total',
      headerName: 'Valor Total',
      width: 130,
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
      // Use provided records
      setPurchases(records);
      setRowCount(records.length);
    } else {
      // Fetch from server
      fetchPurchases();
    }
  }, [paginationModel, refresh, records]);

  useEffect(() => {
    // Debounce da busca
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (paginationModel.page === 0) {
        fetchPurchases();
      } else {
        setPaginationModel({ ...paginationModel, page: 0 });
      }
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery]);

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
          paginationMode="server"
          onPaginationModelChange={setPaginationModel}
          getRowId={(row) => {
            // Try to generate a stable, unique ID with multiple fallbacks
            if (row._id) return row._id;
            if (row.id) return row.id;
            
            // Generate deterministic ID from available fields
            const entity = row.fornecedor || row.cliente || 'unknown';
            const nfe = row.numero_nfe || 'no-nfe';
            const cfop = row.cfop || 'no-cfop';
            const date = row.data_compra || row.data_emissao || 'no-date';
            const valor = row.valor_total || '0';
            
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
