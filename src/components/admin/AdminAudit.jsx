import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const AdminAudit = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState({
    pages: 1,
    total: 0,
    limit: 20
  });

  // Filter state
  const [filters, setFilters] = useState({
    email: '',
    success: '',
    since: ''
  });

  // Track applied filters separately to trigger fetches
  const [appliedFilters, setAppliedFilters] = useState({
    email: '',
    success: '',
    since: ''
  });

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('limit', paginationInfo.limit);

      if (appliedFilters.email.trim()) {
        params.append('email', appliedFilters.email.trim());
      }
      if (appliedFilters.success !== '') {
        params.append('success', appliedFilters.success);
      }
      if (appliedFilters.since) {
        params.append('since', appliedFilters.since);
      }

      const response = await axios.get(`/api/admin/audit?${params.toString()}`);

      if (response.data?.success) {
        setAuditLogs(response.data.items || []);
        setPaginationInfo(prev => ({
          ...prev,
          pages: response.data.pagination?.pages || 1,
          total: response.data.pagination?.total || 0
        }));
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Erro ao buscar logs de auditoria:', err);
      setError(err.response?.data?.message || 'Erro ao carregar logs de auditoria');
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, appliedFilters, paginationInfo.limit]);

  // Fetch when page or applied filters change
  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    setAppliedFilters({ ...filters });
  };

  const handleClearFilters = () => {
    const clearedFilters = { email: '', success: '', since: '' };
    setFilters(clearedFilters);
    setCurrentPage(1);
    setAppliedFilters(clearedFilters);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= paginationInfo.pages) {
      setCurrentPage(newPage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading && auditLogs.length === 0) {
    return (
      <div className="container">
        <div className="loading">Carregando logs de auditoria...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1>Auditoria de Login</h1>
          <p className="page-subtitle" style={{ color: 'var(--medium-gray)', fontSize: '1rem', marginTop: '0.5rem' }}>
            Visualize e filtre os eventos de login do sistema
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Filtros</h3>
        <form onSubmit={handleApplyFilters}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={filters.email}
                onChange={(e) => handleFilterChange('email', e.target.value)}
                placeholder="Filtrar por email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={filters.success}
                onChange={(e) => handleFilterChange('success', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Sucesso</option>
                <option value="false">Falha</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
              <label className="form-label">A partir de</label>
              <input
                type="datetime-local"
                className="form-control"
                value={filters.since}
                onChange={(e) => handleFilterChange('since', e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary">
                Aplicar
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleClearFilters}>
                Limpar
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Results Table */}
      <div className="card">
        <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Data/Hora</th>
                <th style={{ width: '25%' }}>Email</th>
                <th style={{ width: '20%' }}>Usuário</th>
                <th style={{ width: '15%' }}>Status</th>
                <th style={{ width: '20%' }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ fontSize: '0.9rem' }}>{formatDate(log.timestamp)}</td>
                    <td style={{ fontSize: '0.9rem' }}>{log.email || '-'}</td>
                    <td>
                      {log.user ? (
                        <div>
                          <strong>{log.user.username}</strong>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>
                            {log.user.role === 'admin' ? 'Admin' : log.user.role === 'manager' ? 'Gerente' : 'Usuário'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span 
                        className={`badge ${log.success ? 'status-success' : 'status-danger'}`}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                      >
                        {log.success ? 'Sucesso' : 'Falha'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#666' }}>
                      {log.ip || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    {loading ? 'Carregando...' : 'Nenhum registro encontrado'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {paginationInfo.pages > 1 && (
          <div className="pagination" style={{ marginTop: '1.5rem' }}>
            <button
              className="page-btn"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              ««
            </button>
            <button
              className="page-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              «
            </button>

            <span style={{ padding: '0 1rem', color: 'var(--medium-gray)' }}>
              Página {currentPage} de {paginationInfo.pages} ({paginationInfo.total} registros)
            </span>

            <button
              className="page-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === paginationInfo.pages}
            >
              »
            </button>
            <button
              className="page-btn"
              onClick={() => handlePageChange(paginationInfo.pages)}
              disabled={currentPage === paginationInfo.pages}
            >
              »»
            </button>
          </div>
        )}

        {paginationInfo.pages <= 1 && paginationInfo.total > 0 && (
          <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--medium-gray)', fontSize: '0.9rem' }}>
            {paginationInfo.total} registro(s) encontrado(s)
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAudit;
