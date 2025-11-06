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
                  <th>Detalhes</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={`${item.user._id}-${item.company._id}`} style={{
                    backgroundColor: item.hasInconsistency ? '#fff5f5' : item.isLinked ? '#f0f9ff' : 'white'
                  }}>
                    <td>
                      <div>
                        <strong>{item.user.username}</strong>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          {item.user.email} ({item.user.role})
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{item.company.name}</strong>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          {item.company.cnpj}
                        </div>
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
                      <div style={{ fontSize: '11px' }}>
                        {item.isResponsible && <div style={{ color: '#7c3aed' }}>👑 Responsável</div>}
                        {item.isEmployee && <div style={{ color: '#059669' }}>👤 Funcionário</div>}
                        {item.isLinked && <div style={{ color: '#0369a1' }}>🔗 Vinculado</div>}
                        {!item.isLinked && !item.isEmployee && !item.isResponsible && 
                          <div style={{ color: '#6b7280' }}>○ Sem vínculo</div>
                        }
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {item.hasInconsistency && (
                          <button
                            onClick={() => fixInconsistency(item)}
                            className="btn btn-warning"
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          >
                            Corrigir
                          </button>
                        )}
                        {item.isLinked ? (
                          <button
                            onClick={async () => {
                              try {
                                await axios.delete(`/api/admin/users/${item.user._id}/companies/${item.company._id}`);
                                setSuccess('Vínculo removido');
                                fetchData();
                                setTimeout(() => setSuccess(''), 3000);
                              } catch (error) {
                                setError(error.response?.data?.message || 'Erro ao remover vínculo');
                                setTimeout(() => setError(''), 3000);
                              }
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          >
                            Remover
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                await axios.post(`/api/admin/users/${item.user._id}/companies/${item.company._id}`);
                                setSuccess('Vínculo adicionado');
                                fetchData();
                                setTimeout(() => setSuccess(''), 3000);
                              } catch (error) {
                                setError(error.response?.data?.message || 'Erro ao adicionar vínculo');
                                setTimeout(() => setError(''), 3000);
                              }
                            }}
                            className="btn btn-primary"
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          >
                            Adicionar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', fontSize: '14px' }}>
        <h4>Informações sobre Vínculos:</h4>
        <ul style={{ margin: '10px 0' }}>
          <li><strong>Vinculado:</strong> Usuário está associado à empresa (pode visualizar relatórios)</li>
          <li><strong>Funcionário:</strong> Usuário está na lista de funcionários da empresa</li>
          <li><strong>Responsável:</strong> Usuário é o responsável/gerente da empresa</li>
          <li><strong>Inconsistência:</strong> Há desalinhamento entre vínculo e função (precisa correção)</li>
        </ul>
      </div>
    </div>
  );
};

export default UserCompanyLinks;