import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const UserCompanyLinks = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [linkOperation, setLinkOperation] = useState('add'); // 'add' ou 'remove'
  const [managementData, setManagementData] = useState([]);
  const [stats, setStats] = useState(null);
  const [actionLoading, setActionLoading] = useState({}); // Track loading state for individual actions

  // Buscar todos os dados
  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, companiesResponse, statsResponse] = await Promise.all([
        axios.get('/api/admin/users?limit=1000'),
        axios.get('/api/companies?limit=1000'),
        axios.get('/api/admin/user-company-stats')
      ]);

      if (usersResponse.data.success) {
        setUsers(usersResponse.data.data.users);
      }
      if (companiesResponse.data.success) {
        setCompanies(companiesResponse.data.data.companies);
      }
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }

      // Criar dados de gerenciamento
      const management = [];
      if (usersResponse.data.success && companiesResponse.data.success) {
        usersResponse.data.data.users.forEach(user => {
          if (user.role !== 'admin') {
            companiesResponse.data.data.companies.forEach(company => {
              const isLinked = user.companies?.some(userComp => 
                (userComp._id || userComp) === company._id
              );
              const isResponsible = company.responsibleUser && 
                (company.responsibleUser._id || company.responsibleUser) === user._id;
              const isEmployee = company.employees?.some(emp => 
                (emp._id || emp) === user._id
              );

              management.push({
                user,
                company,
                isLinked,
                isResponsible,
                isEmployee,
                hasInconsistency: isLinked !== (isResponsible || isEmployee)
              });
            });
          }
        });
      }
      setManagementData(management);
    } catch (error) {
      setError('Erro ao buscar dados');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin()) {
      fetchData();
    }
  }, [isAdmin]);

  // Executar operação de vínculo
  const executeLinkOperation = async () => {
    if (!selectedUser || !selectedCompany) {
      setError('Selecione um usuário e uma empresa');
      return;
    }

    try {
      setError('');
      let response;

      if (linkOperation === 'add') {
        response = await axios.post(`/api/admin/users/${selectedUser}/companies/${selectedCompany}`);
      } else {
        response = await axios.delete(`/api/admin/users/${selectedUser}/companies/${selectedCompany}`);
      }

      if (response.data.success) {
        setSuccess(`Vínculo ${linkOperation === 'add' ? 'adicionado' : 'removido'} com sucesso!`);
        fetchData(); // Recarregar dados
        setSelectedUser('');
        setSelectedCompany('');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao gerenciar vínculo');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Corrigir inconsistência
  const fixInconsistency = async (item) => {
    try {
      if (item.isLinked && !item.isEmployee && !item.isResponsible) {
        // Usuário está vinculado mas não é funcionário nem responsável - adicionar como funcionário
        await axios.post(`/api/companies/${item.company._id}/employees/${item.user._id}`);
        setSuccess('Inconsistência corrigida: usuário adicionado como funcionário');
      } else if (!item.isLinked && (item.isEmployee || item.isResponsible)) {
        // Usuário é funcionário/responsável mas não está vinculado - adicionar vínculo
        await axios.post(`/api/admin/users/${item.user._id}/companies/${item.company._id}`);
        setSuccess('Inconsistência corrigida: vínculo adicionado');
      }
      
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao corrigir inconsistência');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Helper to get action key for loading state
  const getActionKey = (action, userId, companyId) => `${action}-${userId}-${companyId}`;

  // Handle specific API error messages
  const handleApiError = (error, defaultMessage) => {
    const message = error.response?.data?.message;
    const status = error.response?.status;
    
    if (status === 400) {
      if (message?.includes('já é funcionário')) {
        return 'Usuário já é funcionário desta empresa';
      }
      if (message?.includes('gerentes ou administradores')) {
        return 'Apenas gerentes ou administradores podem ser responsáveis por empresas';
      }
      return message || defaultMessage;
    }
    if (status === 403) {
      return 'Ação permitida apenas para administradores';
    }
    return message || defaultMessage;
  };

  // Add employee to company
  const setEmployee = async (companyId, userId) => {
    const actionKey = getActionKey('setEmployee', userId, companyId);
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    try {
      const response = await axios.post(`/api/companies/${companyId}/employees/${userId}`);
      if (response.data.success) {
        setSuccess('Funcionário adicionado com sucesso');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(handleApiError(error, 'Erro ao adicionar funcionário'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Remove employee from company
  const removeEmployee = async (companyId, userId) => {
    const actionKey = getActionKey('removeEmployee', userId, companyId);
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    try {
      const response = await axios.delete(`/api/companies/${companyId}/employees/${userId}`);
      if (response.data.success) {
        setSuccess('Funcionário removido com sucesso');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(handleApiError(error, 'Erro ao remover funcionário'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Set user as responsible for company
  const setResponsible = async (companyId, userId) => {
    const actionKey = getActionKey('setResponsible', userId, companyId);
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    try {
      const response = await axios.put(`/api/companies/${companyId}/responsible/${userId}`);
      if (response.data.success) {
        setSuccess('Responsável definido com sucesso');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(handleApiError(error, 'Erro ao definir responsável'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Remove responsible from company
  const removeResponsible = async (companyId) => {
    const actionKey = getActionKey('removeResponsible', '', companyId);
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    try {
      const response = await axios.delete(`/api/companies/${companyId}/responsible`);
      if (response.data.success) {
        setSuccess('Responsável removido com sucesso');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(handleApiError(error, 'Erro ao remover responsável'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Check if any action is loading for a specific item
  const isItemLoading = (userId, companyId) => {
    return Object.keys(actionLoading).some(key => 
      key.includes(`${userId}-${companyId}`) && actionLoading[key]
    );
  };

  // Filtrar dados
  const [filters, setFilters] = useState({
    showInconsistencies: false,
    showLinked: true,
    showUnlinked: true,
    userSearch: '',
    companySearch: ''
  });

  const filteredData = managementData.filter(item => {
    if (filters.showInconsistencies && !item.hasInconsistency) return false;
    if (!filters.showLinked && item.isLinked) return false;
    if (!filters.showUnlinked && !item.isLinked) return false;
    if (filters.userSearch && !item.user.username.toLowerCase().includes(filters.userSearch.toLowerCase()) && 
        !item.user.email.toLowerCase().includes(filters.userSearch.toLowerCase())) return false;
    if (filters.companySearch && !item.company.name.toLowerCase().includes(filters.companySearch.toLowerCase())) return false;
    return true;
  });

  if (!isAdmin()) {
    return (
      <div className="alert alert-error">
        Acesso negado. Apenas administradores podem gerenciar vínculos.
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '24px' }}>
      <h1>Gerenciar Vínculos Usuário-Empresa</h1>
      <p style={{ color: 'var(--medium-gray)', marginBottom: '30px' }}>
        Gerencie as relações entre usuários e empresas, corrija inconsistências e monitore vínculos.
      </p>

      {/* Estatísticas */}
      {stats && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3>Estatísticas do Sistema</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>{stats.totalUsers}</div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Total de Usuários</div>
            </div>
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>{stats.totalCompanies}</div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Total de Empresas</div>
            </div>
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#17a2b8' }}>{stats.totalLinks}</div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Total de Vínculos</div>
            </div>
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>{stats.usersWithoutCompanies}</div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Usuários sem Empresa</div>
            </div>
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fd7e14' }}>{stats.companiesWithoutEmployees}</div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Empresas sem Funcionários</div>
            </div>
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: stats.inconsistencies > 0 ? '#f8d7da' : '#d4edda', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stats.inconsistencies > 0 ? '#dc3545' : '#28a745' }}>{stats.inconsistencies}</div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Inconsistências</div>
            </div>
          </div>
          <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '0.9rem', color: '#6c757d' }}>
            <div>
              <strong>Média de vínculos por usuário:</strong> {stats.avgLinksPerUser}
            </div>
            <div>
              <strong>Média de funcionários por empresa:</strong> {stats.avgEmployeesPerCompany}
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Seção de operações rápidas */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>Operações Rápidas</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px', gap: '15px', alignItems: 'end' }}>
          <div className="form-group">
            <label className="form-label">Usuário</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="form-control"
            >
              <option value="">Selecione um usuário</option>
              {users.filter(user => user.role !== 'admin').map(user => (
                <option key={user._id} value={user._id}>
                  {user.username} - {user.email} ({user.role})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Empresa</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="form-control"
            >
              <option value="">Selecione uma empresa</option>
              {companies.map(company => (
                <option key={company._id} value={company._id}>
                  {company.name} - {company.cnpj}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Operação</label>
            <select
              value={linkOperation}
              onChange={(e) => setLinkOperation(e.target.value)}
              className="form-control"
            >
              <option value="add">Adicionar</option>
              <option value="remove">Remover</option>
            </select>
          </div>

          <div className="form-group">
            <button
              onClick={executeLinkOperation}
              className="btn btn-primary"
              disabled={!selectedUser || !selectedCompany}
            >
              Executar
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3>Filtros e Busca</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div className="form-group">
            <label className="form-label">
              <input
                type="checkbox"
                checked={filters.showInconsistencies}
                onChange={(e) => setFilters(prev => ({ ...prev, showInconsistencies: e.target.checked }))}
                style={{ marginRight: '8px' }}
              />
              Apenas inconsistências
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">
              <input
                type="checkbox"
                checked={filters.showLinked}
                onChange={(e) => setFilters(prev => ({ ...prev, showLinked: e.target.checked }))}
                style={{ marginRight: '8px' }}
              />
              Mostrar vinculados
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">
              <input
                type="checkbox"
                checked={filters.showUnlinked}
                onChange={(e) => setFilters(prev => ({ ...prev, showUnlinked: e.target.checked }))}
                style={{ marginRight: '8px' }}
              />
              Mostrar não vinculados
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Buscar usuário</label>
            <input
              type="text"
              value={filters.userSearch}
              onChange={(e) => setFilters(prev => ({ ...prev, userSearch: e.target.value }))}
              className="form-control"
              placeholder="Nome ou email..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Buscar empresa</label>
            <input
              type="text"
              value={filters.companySearch}
              onChange={(e) => setFilters(prev => ({ ...prev, companySearch: e.target.value }))}
              className="form-control"
              placeholder="Nome da empresa..."
            />
          </div>
        </div>
      </div>

      {/* Tabela de vínculos */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Vínculos ({filteredData.length} registros)</h3>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>
            <span style={{ color: '#dc3545' }}>●</span> Inconsistência | 
            <span style={{ color: '#28a745' }}> ●</span> Vinculado | 
            <span style={{ color: '#6c757d' }}> ●</span> Não vinculado
          </div>
        </div>

        {/* Legenda de badges */}
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '12px' }}>
          <strong>Legenda:</strong>{' '}
          <span title="Usuário é responsável/gerente pela empresa">⭐ Responsável</span> |{' '}
          <span title="Usuário é funcionário da empresa">👤 Funcionário</span> |{' '}
          <span title="Usuário tem vínculo genérico com a empresa">🔗 Vinculado</span>
        </div>

        {loading ? (
          <div className="loading">Carregando vínculos...</div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="table">
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                <tr>
                  <th>Usuário</th>
                  <th>Empresa</th>
                  <th>Status</th>
                  <th>Funções</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => {
                  const itemLoading = isItemLoading(item.user._id, item.company._id);
                  const isCompanyActive = item.company.isActive !== false;
                  const canBeResponsible = item.user.role === 'manager' || item.user.role === 'admin';
                  
                  return (
                    <tr key={`${item.user._id}-${item.company._id}`} style={{
                      backgroundColor: item.hasInconsistency ? '#fff5f5' : item.isLinked ? '#f0f9ff' : 'white',
                      opacity: itemLoading ? 0.7 : 1
                    }}>
                      <td>
                        <div>
                          <strong>{item.user.username}</strong>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            {item.user.email}
                          </div>
                          <span style={{
                            fontSize: '10px',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            backgroundColor: item.user.role === 'admin' ? '#dc3545' : item.user.role === 'manager' ? '#0d6efd' : '#6c757d',
                            color: 'white'
                          }}>
                            {item.user.role}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{item.company.name}</strong>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            {item.company.cnpj}
                          </div>
                          {!isCompanyActive && (
                            <span style={{ fontSize: '10px', color: '#dc3545' }}>⚠ Inativa</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{
                            fontSize: '12px',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            color: 'white',
                            backgroundColor: item.hasInconsistency ? '#dc3545' : item.isLinked ? '#28a745' : '#6c757d'
                          }}>
                            {item.hasInconsistency ? 'INCONSISTENTE' : item.isLinked ? 'VINCULADO' : 'NÃO VINCULADO'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {item.isResponsible && (
                            <span 
                              title="Responsável: gerente da empresa com permissões de gestão"
                              style={{ 
                                fontSize: '11px', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fcd34d',
                                cursor: 'help'
                              }}
                            >
                              ⭐ Responsável
                            </span>
                          )}
                          {item.isEmployee && (
                            <span 
                              title="Funcionário: membro da equipe da empresa"
                              style={{ 
                                fontSize: '11px', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                backgroundColor: '#d1fae5',
                                color: '#065f46',
                                border: '1px solid #6ee7b7',
                                cursor: 'help'
                              }}
                            >
                              👤 Funcionário
                            </span>
                          )}
                          {item.isLinked && !item.isEmployee && !item.isResponsible && (
                            <span 
                              title="Vinculado: tem acesso à empresa mas sem função específica"
                              style={{ 
                                fontSize: '11px', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                border: '1px solid #93c5fd',
                                cursor: 'help'
                              }}
                            >
                              🔗 Vinculado
                            </span>
                          )}
                          {!item.isLinked && !item.isEmployee && !item.isResponsible && (
                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                              ○ Sem vínculo
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {/* Inconsistency fix button */}
                          {item.hasInconsistency && (
                            <button
                              onClick={() => fixInconsistency(item)}
                              className="btn btn-warning"
                              style={{ padding: '3px 6px', fontSize: '10px' }}
                              disabled={itemLoading}
                              title="Corrigir inconsistência entre vínculo e função"
                            >
                              🔧 Corrigir
                            </button>
                          )}
                          
                          {/* Employee actions */}
                          {!item.isEmployee && isCompanyActive && (
                            <button
                              onClick={() => setEmployee(item.company._id, item.user._id)}
                              className="btn btn-success"
                              style={{ padding: '3px 6px', fontSize: '10px' }}
                              disabled={itemLoading || !isCompanyActive}
                              title="Adicionar usuário como funcionário da empresa"
                            >
                              👤+ Funcionário
                            </button>
                          )}
                          {item.isEmployee && !item.isResponsible && (
                            <button
                              onClick={() => removeEmployee(item.company._id, item.user._id)}
                              className="btn btn-outline-danger"
                              style={{ padding: '3px 6px', fontSize: '10px', backgroundColor: 'white', borderColor: '#dc3545', color: '#dc3545' }}
                              disabled={itemLoading}
                              title="Remover usuário da lista de funcionários"
                            >
                              👤- Funcionário
                            </button>
                          )}
                          
                          {/* Responsible actions - only for managers/admins */}
                          {!item.isResponsible && canBeResponsible && isCompanyActive && (
                            <button
                              onClick={() => setResponsible(item.company._id, item.user._id)}
                              className="btn btn-warning"
                              style={{ padding: '3px 6px', fontSize: '10px', backgroundColor: '#ffc107', borderColor: '#ffc107', color: '#212529' }}
                              disabled={itemLoading || !isCompanyActive}
                              title="Definir usuário como responsável pela empresa (apenas gerentes/admins)"
                            >
                              ⭐+ Responsável
                            </button>
                          )}
                          {item.isResponsible && (
                            <button
                              onClick={() => removeResponsible(item.company._id)}
                              className="btn btn-outline-warning"
                              style={{ padding: '3px 6px', fontSize: '10px', backgroundColor: 'white', borderColor: '#ffc107', color: '#856404' }}
                              disabled={itemLoading}
                              title="Remover responsabilidade do usuário sobre a empresa"
                            >
                              ⭐- Responsável
                            </button>
                          )}
                          
                          {/* Generic link actions */}
                          {item.isLinked ? (
                            <button
                              onClick={async () => {
                                const actionKey = getActionKey('removeLink', item.user._id, item.company._id);
                                setActionLoading(prev => ({ ...prev, [actionKey]: true }));
                                try {
                                  await axios.delete(`/api/admin/users/${item.user._id}/companies/${item.company._id}`);
                                  setSuccess('Vínculo removido');
                                  fetchData();
                                  setTimeout(() => setSuccess(''), 3000);
                                } catch (error) {
                                  setError(handleApiError(error, 'Erro ao remover vínculo'));
                                  setTimeout(() => setError(''), 3000);
                                } finally {
                                  setActionLoading(prev => ({ ...prev, [actionKey]: false }));
                                }
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '3px 6px', fontSize: '10px' }}
                              disabled={itemLoading}
                              title="Remover vínculo genérico"
                            >
                              🔗- Vínculo
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                const actionKey = getActionKey('addLink', item.user._id, item.company._id);
                                setActionLoading(prev => ({ ...prev, [actionKey]: true }));
                                try {
                                  await axios.post(`/api/admin/users/${item.user._id}/companies/${item.company._id}`);
                                  setSuccess('Vínculo adicionado');
                                  fetchData();
                                  setTimeout(() => setSuccess(''), 3000);
                                } catch (error) {
                                  setError(handleApiError(error, 'Erro ao adicionar vínculo'));
                                  setTimeout(() => setError(''), 3000);
                                } finally {
                                  setActionLoading(prev => ({ ...prev, [actionKey]: false }));
                                }
                              }}
                              className="btn btn-primary"
                              style={{ padding: '3px 6px', fontSize: '10px' }}
                              disabled={itemLoading || !isCompanyActive}
                              title="Adicionar vínculo genérico"
                            >
                              🔗+ Vínculo
                            </button>
                          )}
                          
                          {/* Loading indicator */}
                          {itemLoading && (
                            <span style={{ fontSize: '10px', color: '#6c757d' }}>⏳</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', fontSize: '14px' }}>
        <h4>Informações sobre Vínculos e Funções:</h4>
        <ul style={{ margin: '10px 0', listStyleType: 'none', paddingLeft: 0 }}>
          <li style={{ marginBottom: '8px' }}>
            <span style={{ backgroundColor: '#dbeafe', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>🔗 Vinculado</span>
            Usuário está associado à empresa e pode visualizar relatórios.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <span style={{ backgroundColor: '#d1fae5', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>👤 Funcionário</span>
            Usuário está na lista de funcionários da empresa. Automaticamente vinculado.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <span style={{ backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>⭐ Responsável</span>
            Usuário é o gerente responsável pela empresa. Apenas gerentes ou administradores podem ter esta função. Automaticamente adicionado como funcionário.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <span style={{ backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>⚠ Inconsistência</span>
            Há desalinhamento entre vínculo e função (precisa correção). Use o botão "Corrigir" para resolver.
          </li>
        </ul>
        <h5 style={{ marginTop: '15px' }}>Regras de Negócio:</h5>
        <ul style={{ margin: '10px 0', fontSize: '13px', color: '#4b5563' }}>
          <li>Apenas <strong>gerentes</strong> ou <strong>administradores</strong> podem ser definidos como responsáveis por uma empresa.</li>
          <li>Ao definir um responsável, ele é automaticamente adicionado como funcionário da empresa.</li>
          <li>Não é possível remover um funcionário que seja o responsável atual - primeiro remova a responsabilidade.</li>
          <li>Empresas inativas não permitem adicionar novos funcionários ou responsáveis.</li>
          <li>Administradores têm acesso automático a todas as empresas e não precisam de vínculos específicos.</li>
        </ul>
      </div>
    </div>
  );
};

export default UserCompanyLinks;