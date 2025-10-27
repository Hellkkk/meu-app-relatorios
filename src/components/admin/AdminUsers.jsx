import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    companies: [],
    profile: {
      firstName: '',
      lastName: '',
      phone: ''
    }
  });
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    isActive: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 10
  });

  // Buscar usuários
  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role }),
        ...(filters.isActive !== '' && { isActive: filters.isActive })
      });

      const response = await axios.get(`/api/admin/users?${params}`);
      if (response.data.success) {
        setUsers(response.data.data.users);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      setError('Erro ao buscar usuários');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar empresas para o select
  const fetchCompanies = async () => {
    try {
      const response = await axios.get('/api/companies?limit=100');
      if (response.data.success) {
        setCompanies(response.data.data.companies);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchUsers(1);
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [filters]);

  // Abrir modal para criar/editar usuário
  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        role: user.role,
        companies: user.companies?.map(c => c._id || c) || [],
        profile: {
          firstName: user.profile?.firstName || '',
          lastName: user.profile?.lastName || '',
          phone: user.profile?.phone || ''
        }
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'user',
        companies: [],
        profile: {
          firstName: '',
          lastName: '',
          phone: ''
        }
      });
    }
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  // Fechar modal
  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setError('');
    setSuccess('');
  };

  // Handle form change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('profile.')) {
      const profileField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [profileField]: value
        }
      }));
    } else if (name === 'companies') {
      const selectedOptions = Array.from(e.target.selectedOptions);
      const values = selectedOptions.map(option => option.value);
      setFormData(prev => ({
        ...prev,
        companies: values
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const submitData = { ...formData };
      
      // Se não tem senha nova e está editando, remover o campo password
      if (editingUser && !submitData.password) {
        delete submitData.password;
      }

      const url = editingUser 
        ? `/api/admin/users/${editingUser._id}`
        : '/api/admin/users';
      
      const method = editingUser ? 'put' : 'post';
      
      const response = await axios[method](url, submitData);
      
      if (response.data.success) {
        setSuccess(editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
        fetchUsers(pagination.current);
        setTimeout(() => {
          closeModal();
        }, 1500);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao salvar usuário');
    }
  };

  // Ativar/desativar usuário
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await axios.put(`/api/admin/users/${userId}`, {
        isActive: !currentStatus
      });
      setSuccess(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      fetchUsers(pagination.current);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Erro ao alterar status do usuário');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Remover usuário de empresa específica
  const removeUserFromCompany = async (userId, companyId, companyName) => {
    if (!window.confirm(`Tem certeza que deseja remover este usuário da empresa "${companyName}"?`)) {
      return;
    }

    try {
      const response = await axios.delete(`/api/admin/users/${userId}/companies/${companyId}`);
      if (response.data.success) {
        setSuccess('Usuário removido da empresa com sucesso!');
        fetchUsers(pagination.current);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao remover usuário da empresa');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Adicionar usuário a empresa específica
  const addUserToCompany = async (userId, companyId) => {
    try {
      const response = await axios.post(`/api/admin/users/${userId}/companies/${companyId}`);
      if (response.data.success) {
        setSuccess('Usuário adicionado à empresa com sucesso!');
        fetchUsers(pagination.current);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao adicionar usuário à empresa');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      role: '',
      isActive: ''
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Gerenciar Usuários</h1>
        <button 
          className="btn btn-primary"
          onClick={() => openModal()}
        >
          Novo Usuário
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Filtros</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
          <div className="form-group">
            <label className="form-label">Buscar</label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              className="form-control"
              placeholder="Nome, email..."
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Cargo</label>
            <select
              name="role"
              value={filters.role}
              onChange={handleFilterChange}
              className="form-control"
            >
              <option value="">Todos</option>
              <option value="admin">Admin</option>
              <option value="manager">Gerente</option>
              <option value="user">Usuário</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              name="isActive"
              value={filters.isActive}
              onChange={handleFilterChange}
              className="form-control"
            >
              <option value="">Todos</option>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
          
          <div className="form-group">
            <button 
              className="btn btn-secondary"
              onClick={clearFilters}
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Lista de usuários */}
      <div className="card">
        {loading ? (
          <div className="loading">Carregando usuários...</div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Cargo</th>
                  <th>Empresas</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>
                      <div>
                        <strong>{user.username}</strong>
                        {user.profile?.firstName && (
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            {user.profile.firstName} {user.profile.lastName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: user.role === 'admin' ? 'var(--role-admin)' : user.role === 'manager' ? 'var(--role-manager)' : 'var(--role-user)',
                        color: 'white'
                      }}>
                        {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Gerente' : 'Usuário'}
                      </span>
                    </td>
                    <td>
                      {user.companies?.length > 0 ? (
                        <div>
                          {user.companies.slice(0, 2).map(company => (
                            <div key={company._id || company} style={{ 
                              fontSize: '12px', 
                              display: 'flex', 
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '2px',
                              padding: '2px 4px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '3px'
                            }}>
                              <span>{company.name || company}</span>
                              {user.role !== 'admin' && (
                                <button
                                  onClick={() => removeUserFromCompany(user._id, company._id || company, company.name || company)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#dc3545',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    padding: '0 2px',
                                    marginLeft: '5px'
                                  }}
                                  title="Remover da empresa"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          {user.companies.length > 2 && (
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>
                              +{user.companies.length - 2} outras
                            </div>
                          )}
                          {user.role !== 'admin' && (
                            <div style={{ marginTop: '5px' }}>
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    addUserToCompany(user._id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 4px',
                                  border: '1px solid #ddd',
                                  borderRadius: '3px',
                                  width: '100%'
                                }}
                              >
                                <option value="">+ Adicionar empresa</option>
                                {companies
                                  .filter(company => !user.companies.some(userComp => 
                                    (userComp._id || userComp) === company._id
                                  ))
                                  .map(company => (
                                    <option key={company._id} value={company._id}>
                                      {company.name}
                                    </option>
                                  ))
                                }
                              </select>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span style={{ color: '#6c757d', fontSize: '12px' }}>
                            {user.role === 'admin' ? 'Todas' : 'Nenhuma'}
                          </span>
                          {user.role !== 'admin' && companies.length > 0 && (
                            <div style={{ marginTop: '5px' }}>
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    addUserToCompany(user._id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 4px',
                                  border: '1px solid #ddd',
                                  borderRadius: '3px',
                                  width: '100%'
                                }}
                              >
                                <option value="">+ Adicionar empresa</option>
                                {companies.map(company => (
                                  <option key={company._id} value={company._id}>
                                    {company.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: user.isActive ? 'var(--success-color)' : 'var(--muted-color)',
                        color: 'white'
                      }}>
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => openModal(user)}
                        >
                          Editar
                        </button>
                        <button
                          className={`btn ${user.isActive ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => toggleUserStatus(user._id, user.isActive)}
                        >
                          {user.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginação */}
            {pagination.pages > 1 && (
              <div className="pagination">
                <button 
                  className="page-btn"
                  disabled={pagination.current === 1}
                  onClick={() => fetchUsers(pagination.current - 1)}
                >
                  Anterior
                </button>
                
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`page-btn ${pagination.current === page ? 'active' : ''}`}
                    onClick={() => fetchUsers(page)}
                  >
                    {page}
                  </button>
                ))}
                
                <button 
                  className="page-btn"
                  disabled={pagination.current === pagination.pages}
                  onClick={() => fetchUsers(pagination.current + 1)}
                >
                  Próximo
                </button>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '10px', color: '#6c757d', fontSize: '14px' }}>
              Mostrando {users.length} de {pagination.total} usuários
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginTop: 0 }}>
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleFormChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Senha {editingUser ? '(deixe em branco para manter a atual)' : '*'}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  className="form-control"
                  required={!editingUser}
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cargo *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleFormChange}
                  className="form-control"
                  required
                >
                  <option value="user">Usuário</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {formData.role === 'user' && (
                <div className="form-group">
                  <label className="form-label">Empresas (opcional)</label>
                  <select
                    name="companies"
                    multiple
                    value={formData.companies}
                    onChange={handleFormChange}
                    className="form-control"
                    style={{ height: '120px' }}
                  >
                    {companies.map(company => (
                      <option key={company._id} value={company._id}>
                        {company.name} - {company.cnpj}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#6c757d' }}>
                    Segure Ctrl (Windows) ou Cmd (Mac) para selecionar múltiplas empresas
                  </small>
                </div>
              )}

              {formData.role === 'manager' && (
                <div className="form-group">
                  <label className="form-label">Empresas (obrigatório para gerentes)</label>
                  <select
                    name="companies"
                    multiple
                    value={formData.companies}
                    onChange={handleFormChange}
                    className="form-control"
                    style={{ height: '120px' }}
                    required
                  >
                    {companies.map(company => (
                      <option key={company._id} value={company._id}>
                        {company.name} - {company.cnpj}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#6c757d' }}>
                    Gerentes devem estar associados a pelo menos uma empresa. Segure Ctrl (Windows) ou Cmd (Mac) para selecionar múltiplas empresas
                  </small>
                </div>
              )}

              <h4 style={{ marginTop: '25px', marginBottom: '15px' }}>Informações Pessoais (opcional)</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Nome</label>
                  <input
                    type="text"
                    name="profile.firstName"
                    value={formData.profile.firstName}
                    onChange={handleFormChange}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sobrenome</label>
                  <input
                    type="text"
                    name="profile.lastName"
                    value={formData.profile.lastName}
                    onChange={handleFormChange}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  type="tel"
                  name="profile.phone"
                  value={formData.profile.phone}
                  onChange={handleFormChange}
                  className="form-control"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Atualizar' : 'Criar'} Usuário
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;