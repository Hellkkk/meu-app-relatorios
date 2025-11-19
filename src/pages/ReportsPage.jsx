import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Grid, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem, ToggleButtonGroup, ToggleButton } from '@mui/material';
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
  
  // New state for company and report type selection
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [reportType, setReportType] = useState('purchases');
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [fileName, setFileName] = useState(''); // Track current file being displayed
  
  // Verifica se o upload manual está habilitado via variável de ambiente
  const uploadEnabled = import.meta.env.VITE_ENABLE_UPLOAD === 'true';

  // Load user's linked companies
  useEffect(() => {
    loadCompanies();
  }, []);

  // Load dashboard data when company or type changes
  useEffect(() => {
    if (selectedCompany) {
      loadDashboardData();
    }
  }, [selectedCompany, reportType, refreshKey]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const response = await http.get('/companies?limit=1000');
      if (response.data.success) {
        const companiesList = response.data.data?.companies || [];
        setCompanies(companiesList);
        
        // Auto-select first company if available
        if (companiesList.length > 0 && !selectedCompany) {
          setSelectedCompany(companiesList[0]._id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
      setError('Erro ao carregar empresas vinculadas');
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadDashboardData = async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    setError(null);

    try {
      // Load data from new endpoint
      const summaryRes = await http.get(`/reports/${selectedCompany}/summary?type=${reportType}`);

      if (summaryRes.data.success) {
        const data = summaryRes.data.data;
        
        // Set fileName from response
        setFileName(data.fileName || '');
        
        // Set summary cards data
        setSummary({
          totalRecords: data.summary.totalRecords,
          totalValue: data.summary.totalValue,
          totalICMS: data.summary.totalICMS,
          totalIPI: data.summary.totalIPI,
          totalCOFINS: data.summary.totalCOFINS,
          averageValue: data.summary.averageValue
        });
        
        // Set chart data
        setSupplierData(data.byEntity || []);
        setTaxesData(data.taxesBreakdown || []);
        setMonthlyData(data.byMonth || []);
      }

    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setError(err.response?.data?.message || 'Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleImported = () => {
    // Incrementar refreshKey para recarregar todos os dados
    setRefreshKey(prev => prev + 1);
  };

  const handleCompanyChange = (event) => {
    setSelectedCompany(event.target.value);
  };

  const handleReportTypeChange = (event, newType) => {
    if (newType !== null) {
      setReportType(newType);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Relatórios
      </Typography>

      {/* Company and Report Type Selectors */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 300 }} disabled={loadingCompanies}>
          <InputLabel id="company-select-label">Empresa</InputLabel>
          <Select
            labelId="company-select-label"
            id="company-select"
            value={selectedCompany}
            label="Empresa"
            onChange={handleCompanyChange}
          >
            {companies.map((company) => (
              <MenuItem key={company._id} value={company._id}>
                {company.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup
          value={reportType}
          exclusive
          onChange={handleReportTypeChange}
          aria-label="tipo de relatório"
          disabled={!selectedCompany || loading}
        >
          <ToggleButton value="purchases" aria-label="compras">
            Compras
          </ToggleButton>
          <ToggleButton value="sales" aria-label="vendas">
            Vendas
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {!selectedCompany && !loadingCompanies ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Nenhuma empresa vinculada. Entre em contato com o administrador para ter acesso.
        </Alert>
      ) : selectedCompany && !uploadEnabled ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Dados carregados automaticamente do arquivo configurado para esta empresa.
          {fileName && <Box component="span" sx={{ fontWeight: 'bold', ml: 1 }}>Arquivo: {fileName}</Box>}
        </Alert>
      ) : uploadEnabled ? (
        <UploadPanel onImported={handleImported} />
      ) : null}

      {loading || loadingCompanies ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : selectedCompany && summary ? (
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
                <PurchasesBySupplierChart 
                  data={supplierData} 
                  height={360}
                  title={reportType === 'purchases' ? 'Top Fornecedores' : 'Top Clientes'}
                />
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
                <MonthlyPurchasesChart 
                  data={monthlyData} 
                  height={360}
                  title={reportType === 'purchases' ? 'Compras Mensais' : 'Vendas Mensais'}
                />
              </Box>
            </Box>

            {/* Table */}
            <Box>
              <PurchasesTable refresh={refreshKey} records={summary.records || []} type={reportType} />
            </Box>
          </Box>
        </>
      ) : null}
    </Container>
  );
};

export default ReportsPage;
