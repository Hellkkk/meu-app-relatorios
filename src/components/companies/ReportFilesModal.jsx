import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const ReportFilesModal = ({ isOpen, onClose, companyId, companyName }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [reportFiles, setReportFiles] = useState({
    purchasesReportPath: '',
    salesReportPath: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Manage body.modal-open class
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  // Load available Excel files and current report files when modal opens
  useEffect(() => {
    if (isOpen && companyId) {
      loadAvailableFiles();
      loadCurrentReportFiles();
    }
  }, [isOpen, companyId]);

  const loadAvailableFiles = async () => {
    try {
      const response = await axios.get('/api/reports/xlsx-files');
      if (response.data.success) {
        setAvailableFiles(response.data.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar arquivos disponíveis:', err);
      setError('Erro ao carregar lista de arquivos Excel');
    }
  };

  const loadCurrentReportFiles = async () => {
    try {
      const response = await axios.get(`/api/companies/${companyId}/report-files`);
      if (response.data.success) {
        setReportFiles({
          purchasesReportPath: response.data.data.purchasesReportPath || '',
          salesReportPath: response.data.data.salesReportPath || ''
        });
      }
    } catch (err) {
      console.error('Erro ao carregar arquivos de relatório atuais:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.put(`/api/companies/${companyId}/report-files`, reportFiles);
      if (response.data.success) {
        setSuccess('Arquivos de relatório atualizados com sucesso!');
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Erro ao atualizar arquivos de relatório:', err);
      setError(err.response?.data?.message || 'Erro ao atualizar arquivos de relatório');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Configurar Relatórios - {companyName}</h2>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            Fechar
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Arquivo de Relatório de Compras</label>
            <select
              className="form-control"
              value={reportFiles.purchasesReportPath}
              onChange={(e) => setReportFiles({ ...reportFiles, purchasesReportPath: e.target.value })}
            >
              <option value="">-- Nenhum arquivo selecionado --</option>
              {availableFiles
                .filter(file => file.filename.toLowerCase().includes('compra'))
                .map((file) => (
                  <option key={file.relativePath} value={file.relativePath}>
                    {file.filename}
                  </option>
                ))}
              {/* Show all files as fallback */}
              <optgroup label="Todos os arquivos">
                {availableFiles.map((file) => (
                  <option key={file.relativePath} value={file.relativePath}>
                    {file.filename}
                  </option>
                ))}
              </optgroup>
            </select>
            <small className="form-text text-muted">
              Selecione o arquivo Excel que contém os dados de compras desta empresa
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Arquivo de Relatório de Vendas</label>
            <select
              className="form-control"
              value={reportFiles.salesReportPath}
              onChange={(e) => setReportFiles({ ...reportFiles, salesReportPath: e.target.value })}
            >
              <option value="">-- Nenhum arquivo selecionado --</option>
              {availableFiles
                .filter(file => file.filename.toLowerCase().includes('venda'))
                .map((file) => (
                  <option key={file.relativePath} value={file.relativePath}>
                    {file.filename}
                  </option>
                ))}
              {/* Show all files as fallback */}
              <optgroup label="Todos os arquivos">
                {availableFiles.map((file) => (
                  <option key={file.relativePath} value={file.relativePath}>
                    {file.filename}
                  </option>
                ))}
              </optgroup>
            </select>
            <small className="form-text text-muted">
              Selecione o arquivo Excel que contém os dados de vendas desta empresa
            </small>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportFilesModal;
