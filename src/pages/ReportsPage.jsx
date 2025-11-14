import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Grid, CircularProgress, Alert } from '@mui/material';
import UploadPanel from '../components/purchases/UploadPanel';
import ReportSummaryCards from '../components/purchases/ReportSummaryCards';
import PurchasesBySupplierChart from '../components/charts/PurchasesBySupplierChart';
import TaxesBreakdownChart from '../components/charts/TaxesBreakdownChart';
import MonthlyPurchasesChart from '../components/charts/MonthlyPurchasesChart';
import PurchasesTable from '../components/purchases/PurchasesTable';
import http from '../api/http';

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [supplierData, setSupplierData] = useState([]);
  const [taxesData, setTaxesData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Verifica se o upload manual está habilitado via variável de ambiente
  const uploadEnabled = import.meta.env.VITE_ENABLE_UPLOAD === 'true';

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Carregar todos os dados em paralelo
      const [summaryRes, supplierRes, taxesRes, monthlyRes] = await Promise.all([
        http.get('/purchase-reports/summary'),
        http.get('/purchase-reports/by-supplier?limit=10'),
        http.get('/purchase-reports/taxes-breakdown'),
        http.get('/purchase-reports/monthly')
      ]);

      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }

      if (supplierRes.data.success) {
        setSupplierData(supplierRes.data.data);
      }

      if (taxesRes.data.success) {
        setTaxesData(taxesRes.data.data);
      }

      if (monthlyRes.data.success) {
        setMonthlyData(monthlyRes.data.data);
      }

    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setError(err.response?.data?.message || 'Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [refreshKey]);

  const handleImported = () => {
    // Incrementar refreshKey para recarregar todos os dados
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Relatórios de Compras
      </Typography>

      {uploadEnabled ? (
        <UploadPanel onImported={handleImported} />
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          Dados carregados automaticamente de <strong>Compras_AVM.xlsx</strong> do repositório.
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <>
          <ReportSummaryCards summary={summary} />

          {/* Content area wrapper for charts and table */}
          <Box sx={{ width: '100%' }}>
            {/* Charts container with CSS-based width distribution */}
            <Box
              sx={{
                width: '100%',
                mb: 3,
                display: 'flex',
                gap: 'var(--charts-gap)',
                '--charts-gap': '24px',
                flexWrap: 'nowrap',
              }}
            >
              <Box sx={{ 
                flex: '0 0 calc((100% - 2 * var(--charts-gap)) / 3)',
                width: 'calc((100% - 2 * var(--charts-gap)) / 3)',
                minWidth: 0,
              }}>
                <PurchasesBySupplierChart data={supplierData} height={360} />
              </Box>
              <Box sx={{ 
                flex: '0 0 calc((100% - 2 * var(--charts-gap)) / 3)',
                width: 'calc((100% - 2 * var(--charts-gap)) / 3)',
                minWidth: 0,
              }}>
                <TaxesBreakdownChart data={taxesData} height={360} />
              </Box>
              <Box sx={{ 
                flex: '0 0 calc((100% - 2 * var(--charts-gap)) / 3)',
                width: 'calc((100% - 2 * var(--charts-gap)) / 3)',
                minWidth: 0,
              }}>
                <MonthlyPurchasesChart data={monthlyData} height={360} />
              </Box>
            </Box>

            {/* Table */}
            <Box>
              <PurchasesTable refresh={refreshKey} />
            </Box>
          </Box>
        </>
      )}
    </Container>
  );
};

export default ReportsPage;
