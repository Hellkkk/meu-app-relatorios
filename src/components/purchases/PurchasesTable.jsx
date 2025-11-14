import React, { useState, useEffect } from 'react';
import { Paper, Typography, TextField, Box, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import http from '../../api/http';

const PurchasesTable = ({ refresh }) => {
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Função para converter valores PT-BR em números
  const toNumberBR = (value) => {
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
    return isNaN(num) ? 0 : num;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const columns = [
    {
      field: 'data_compra',
      headerName: 'Data',
      width: 120,
      valueFormatter: (params) => formatDate(params.value)
    },
    {
      field: 'fornecedor',
      headerName: 'Fornecedor',
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
      valueGetter: (params) => toNumberBR(params.row.valor_total),
      valueFormatter: (params) => formatCurrency(params.value)
    },
    {
      field: 'icms',
      headerName: 'ICMS',
      width: 120,
      valueGetter: (params) => toNumberBR(params.row.icms),
      valueFormatter: (params) => formatCurrency(params.value)
    },
    {
      field: 'ipi',
      headerName: 'IPI',
      width: 120,
      valueGetter: (params) => toNumberBR(params.row.ipi),
      valueFormatter: (params) => formatCurrency(params.value)
    },
    {
      field: 'cofins',
      headerName: 'COFINS',
      width: 120,
      valueGetter: (params) => toNumberBR(params.row.cofins),
      valueFormatter: (params) => formatCurrency(params.value)
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
    fetchPurchases();
  }, [paginationModel, refresh]);

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
        Tabela de Compras
      </Typography>

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Buscar"
          placeholder="Pesquisar por fornecedor, CFOP ou número de NFe"
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
          getRowId={(row) => row._id}
          disableRowSelectionOnClick
        />
      </Box>
    </Paper>
  );
};

export default PurchasesTable;
