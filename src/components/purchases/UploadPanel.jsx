import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Alert
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import http from '../../api/http';

const UploadPanel = ({ onImported }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState('append');
  const [source, setSource] = useState('');
  const [message, setMessage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setMessage(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Selecione um arquivo primeiro' });
      return;
    }

    if (!source.trim()) {
      setMessage({ type: 'error', text: 'Digite uma etiqueta para a fonte de dados' });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('mode', mode);
    formData.append('source', source);

    setUploading(true);
    setProgress(0);
    setMessage(null);

    try {
      const response = await http.post('/purchases/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: `Importação concluída! ${response.data.imported} registros importados.`
        });
        setSelectedFile(null);
        setSource('');
        
        // Notificar o componente pai para recarregar os dados
        if (onImported) {
          onImported();
        }
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Erro ao fazer upload do arquivo'
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Importar Planilha de Compras
      </Typography>

      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.400',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          mb: 2
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.500', mb: 1 }} />
        {selectedFile ? (
          <Typography>Arquivo selecionado: {selectedFile.name}</Typography>
        ) : (
          <>
            <Typography>
              Arraste e solte um arquivo Excel aqui, ou clique para selecionar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              (Apenas arquivos .xlsx ou .xls)
            </Typography>
          </>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Modo de Importação</InputLabel>
          <Select
            value={mode}
            label="Modo de Importação"
            onChange={(e) => setMode(e.target.value)}
            disabled={uploading}
          >
            <MenuItem value="append">Adicionar (Append)</MenuItem>
            <MenuItem value="replace">Substituir (Replace)</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Etiqueta da Fonte"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Ex: Compras-2025-10"
          disabled={uploading}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
      </Box>

      {uploading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            Enviando... {progress}%
          </Typography>
        </Box>
      )}

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={handleUpload}
        disabled={uploading || !selectedFile}
        startIcon={<CloudUploadIcon />}
      >
        {uploading ? 'Enviando...' : 'Importar Arquivo'}
      </Button>
    </Paper>
  );
};

export default UploadPanel;
