import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Collapse,
  Tooltip
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import http from '../../api/http';

const AIAssistantPanel = ({ companyId, reportType }) => {
  // AI status
  const [aiStatus, setAiStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  
  // Summary state
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchExpanded, setSearchExpanded] = useState(true);

  // Check AI status on mount
  useEffect(() => {
    checkAIStatus();
  }, []);

  // Reset summary when company or type changes
  useEffect(() => {
    setSummary(null);
    setSummaryError(null);
  }, [companyId, reportType]);

  const checkAIStatus = async () => {
    setLoadingStatus(true);
    try {
      const response = await http.get('/ai/status');
      if (response.data.success) {
        setAiStatus(response.data.data);
      }
    } catch (error) {
      console.error('Error checking AI status:', error);
      setAiStatus({ available: false, gemini: false, qdrant: false });
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleGenerateSummary = async (force = false) => {
    if (!companyId) return;
    
    setSummaryLoading(true);
    setSummaryError(null);
    
    try {
      const response = await http.post(`/ai/summary/${companyId}?type=${reportType}&force=${force}`);
      
      if (response.data.success) {
        setSummary(response.data.data);
      } else {
        setSummaryError(response.data.message || 'Erro ao gerar resumo');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      setSummaryError(
        error.response?.data?.message || 
        'Erro ao gerar resumo de IA. Verifique se o serviço está disponível.'
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    setSearchError(null);
    
    try {
      const response = await http.get(`/ai/search?q=${encodeURIComponent(searchQuery.trim())}`);
      
      if (response.data.success) {
        setSearchResult(response.data.data);
      } else {
        setSearchError(response.data.message || 'Erro na busca');
      }
    } catch (error) {
      console.error('Error searching:', error);
      setSearchError(
        error.response?.data?.message || 
        'Erro na busca semântica. Verifique se o serviço está disponível.'
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !searchLoading) {
      handleSearch();
    }
  };

  // Show loading state
  if (loadingStatus) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography>Verificando disponibilidade de IA...</Typography>
        </Box>
      </Paper>
    );
  }

  // Show warning if AI is not available
  if (!aiStatus?.available && !aiStatus?.gemini) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Alert severity="info" icon={<InfoIcon />}>
          <Typography variant="subtitle2" gutterBottom>
            Assistente de IA não disponível
          </Typography>
          <Typography variant="body2">
            Para habilitar funcionalidades de IA (resumo conversacional e busca semântica), 
            configure as variáveis de ambiente GOOGLE_API_KEY e QDRANT_URL.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  const typeLabel = reportType === 'purchases' ? 'Compras' : 'Vendas';

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AIIcon color="primary" />
        <Typography variant="h6">Assistente de IA</Typography>
        <Chip 
          label={aiStatus?.qdrant ? 'Busca ativa' : 'Apenas resumos'} 
          size="small" 
          color={aiStatus?.qdrant ? 'success' : 'warning'} 
          variant="outlined"
        />
      </Box>

      {/* Summary Section */}
      <Box sx={{ mb: 3 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
            borderRadius: 1,
            p: 1,
            ml: -1,
            mr: -1
          }}
          onClick={() => setSummaryExpanded(!summaryExpanded)}
        >
          <Typography variant="subtitle1" fontWeight="medium">
            Resumo IA - {typeLabel}
          </Typography>
          <IconButton size="small">
            {summaryExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        
        <Collapse in={summaryExpanded}>
          <Box sx={{ pt: 1 }}>
            {!companyId ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Selecione uma empresa para gerar o resumo de IA.
              </Alert>
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={summaryLoading ? <CircularProgress size={16} color="inherit" /> : <AIIcon />}
                    onClick={() => handleGenerateSummary(false)}
                    disabled={summaryLoading}
                  >
                    {summaryLoading ? 'Gerando...' : 'Gerar Resumo IA'}
                  </Button>
                  
                  {summary && (
                    <Tooltip title="Regenerar resumo ignorando cache">
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => handleGenerateSummary(true)}
                        disabled={summaryLoading}
                      >
                        Regenerar
                      </Button>
                    </Tooltip>
                  )}
                </Box>

                {summaryError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {summaryError}
                  </Alert>
                )}

                {summary && (
                  <Box 
                    sx={{ 
                      bgcolor: 'grey.50', 
                      p: 2, 
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.7
                      }}
                    >
                      {summary.summary}
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Chip 
                        label={summary.cached ? 'Cache' : 'Novo'} 
                        size="small" 
                        color={summary.cached ? 'default' : 'primary'}
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {summary.recordsSampled} registros analisados
                      </Typography>
                      {summary.updatedAt && (
                        <Typography variant="caption" color="text.secondary">
                          Atualizado: {new Date(summary.updatedAt).toLocaleString('pt-BR')}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Collapse>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Search Section */}
      <Box>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
            borderRadius: 1,
            p: 1,
            ml: -1,
            mr: -1
          }}
          onClick={() => setSearchExpanded(!searchExpanded)}
        >
          <Typography variant="subtitle1" fontWeight="medium">
            Perguntas em Linguagem Natural
          </Typography>
          <IconButton size="small">
            {searchExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        
        <Collapse in={searchExpanded}>
          <Box sx={{ pt: 1 }}>
            {!aiStatus?.qdrant ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Busca semântica não disponível. Configure QDRANT_URL para habilitar.
              </Alert>
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Ex: Quais os 3 maiores fornecedores no último mês?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={searchLoading}
                  />
                  <Button
                    variant="contained"
                    startIcon={searchLoading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                    onClick={handleSearch}
                    disabled={searchLoading || !searchQuery.trim()}
                  >
                    Buscar
                  </Button>
                </Box>

                {searchError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {searchError}
                  </Alert>
                )}

                {searchResult && (
                  <Box>
                    <Box 
                      sx={{ 
                        bgcolor: 'grey.50', 
                        p: 2, 
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.200',
                        mb: 2
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.7
                        }}
                      >
                        {searchResult.answer}
                      </Typography>
                    </Box>

                    {searchResult.sources && searchResult.sources.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Fontes ({searchResult.sources.length}):
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {searchResult.sources.map((source, idx) => (
                            <Chip
                              key={idx}
                              label={`${source.type === 'purchases' ? 'Compras' : 'Vendas'} (${(source.score * 100).toFixed(0)}%)`}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </>
            )}
          </Box>
        </Collapse>
      </Box>
    </Paper>
  );
};

export default AIAssistantPanel;
