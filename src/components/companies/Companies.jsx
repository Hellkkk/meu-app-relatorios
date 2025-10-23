import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const Companies = () => {
  const { user, isAdmin, isManager } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    description: '',
    sector: '',
    responsibleUser: '',
    employees: [],
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    },
    contact: {
      phone: '',
      email: '',
      website: ''
    }
  });
  const [filters, setFilters] = useState({
    search: '',
    sector: '',
    isActive: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 10
  });

  // Buscar empresas
  const fetchCompanies = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.sector && { sector: filters.sector }),
        ...(filters.isActive !== '' && { isActive: filters.isActive })
      });

      const response = await axios.get(`/api/companies?${params}`);
      if (response.data.success) {
        setCompanies(response.data.data.companies);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      setError('Erro ao buscar empresas');
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar usuários para os selects
  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users?limit=1000');
      if (response.data.success) {
        setUsers(response.data.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchCompanies();
    if (isAdmin() || isManager()) {
      fetchUsers();
    }
  }, []);

  // Função para verificar se o usuário pode editar uma empresa
  const canEditCompany = (company) => {
    if (isAdmin()) return true;
    if (isManager() && company.responsibleUser?._id === user._id) return true;
    return false;
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchCompanies(1);
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [filters]);

  // Abrir modal para criar/editar empresa
  const openModal = (company = null) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name || '',
        cnpj: company.cnpj || '',
        description: company.description || '',
        sector: company.sector || '',
        responsibleUser: company.responsibleUser?._id || company.responsibleUser || '',
        employees: company.employees?.map(emp => emp._id || emp) || [],
        address: {
          street: company.address?.street || '',
          number: company.address?.number || '',
          complement: company.address?.complement || '',
          neighborhood: company.address?.neighborhood || '',
          city: company.address?.city || '',
          state: company.address?.state || '',
          zipCode: company.address?.zipCode || ''
        },
        contact: {
          phone: company.contact?.phone || '',
          email: company.contact?.email || '',
          website: company.contact?.website || ''
        }
      });
    } else {
      setEditingCompany(null);
      setFormData({
        name: '',
        cnpj: '',
        description: '',
        sector: '',
        responsibleUser: '',
        employees: [],
        address: {
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
          zipCode: ''
        },
        contact: {
          phone: '',
          email: '',
          website: ''
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
    setEditingCompany(null);
    setError('');
    setSuccess('');
  };

  // Abrir modal de funcionários
  const openEmployeesModal = (company) => {
    setSelectedCompany(company);
    setShowEmployeesModal(true);
  };

  // Fechar modal de funcionários
  const closeEmployeesModal = () => {
    setShowEmployeesModal(false);
    setSelectedCompany(null);
  };

  // Handle form change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else if (name.startsWith('contact.')) {
      const contactField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        contact: {
          ...prev.contact,
          [contactField]: value
        }
      }));
    } else if (name === 'employees') {
      const selectedOptions = Array.from(e.target.selectedOptions);
      const values = selectedOptions.map(option => option.value);
      setFormData(prev => ({
        ...prev,
        employees: values
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
      const url = editingCompany 
        ? `/api/companies/${editingCompany._id}`
        : '/api/companies';
      
      const method = editingCompany ? 'put' : 'post';
      
      const response = await axios[method](url, formData);
      
      if (response.data.success) {
        setSuccess(editingCompany ? 'Empresa atualizada com sucesso!' : 'Empresa criada com sucesso!');
        fetchCompanies(pagination.current);
        setTimeout(() => {
          closeModal();
        }, 1500);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao salvar empresa');
    }
  };

  // Ativar/desativar empresa
  const toggleCompanyStatus = async (companyId, currentStatus) => {
    try {
      await axios.put(`/api/companies/${companyId}`, {
        isActive: !currentStatus
      });
      setSuccess(`Empresa ${!currentStatus ? 'ativada' : 'desativada'} com sucesso!`);
      fetchCompanies(pagination.current);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Erro ao alterar status da empresa');
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
      sector: '',
      isActive: ''
    });
  };

  // Format CNPJ
  const formatCNPJ = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  // Handle CNPJ change with formatting
  const handleCNPJChange = (e) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData(prev => ({
      ...prev,
      cnpj: formatted
    }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Gerenciar Empresas</h1>
        {isAdmin() && (
          <button 
            className="btn btn-primary"
            onClick={() => openModal()}
          >
            Nova Empresa
          </button>
        )}
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
              placeholder="Nome, CNPJ..."
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Setor</label>
            <input
              type="text"
              name="sector"
              value={filters.sector}
              onChange={handleFilterChange}
              className="form-control"
              placeholder="Tecnologia, Saúde..."
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              name="isActive"
              value={filters.isActive}
              onChange={handleFilterChange}
              className="form-control"
            >
              <option value="">Todas</option>
              <option value="true">Ativa</option>
              <option value="false">Inativa</option>
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

      {/* Lista de empresas */}
      <div className="card">
        {loading ? (
          <div className="loading">Carregando empresas...</div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>CNPJ</th>
                  <th>Setor</th>
                  <th>Responsável</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(company => (
                  <tr key={company._id}>
                    <td>
                      <div>
                        <strong>{company.name}</strong>
                        {company.description && (
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            {company.description.substring(0, 50)}
                            {company.description.length > 50 && '...'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{company.cnpj}</td>
                    <td>{company.sector || '-'}</td>
                    <td>
                      {company.responsibleUser ? (
                        <div>
                          <div style={{ fontSize: '14px' }}>
                            {company.responsibleUser.username || company.responsibleUser}
                          </div>
                          {company.responsibleUser.email && (
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>
                              {company.responsibleUser.email}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#6c757d', fontSize: '12px' }}>
                          Não definido
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: company.isActive ? 'var(--success-color)' : 'var(--muted-color)',
                        color: 'white'
                      }}>
                        {company.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-info"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => openEmployeesModal(company)}
                        >
                          Funcionários
                        </button>
                        {canEditCompany(company) && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => openModal(company)}
                          >
                            Editar
                          </button>
                        )}
                        {isAdmin() && (
                          <button
                            className={`btn ${company.isActive ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => toggleCompanyStatus(company._id, company.isActive)}
                          >
                            {company.isActive ? 'Desativar' : 'Ativar'}
                          </button>
                        )}
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
                  onClick={() => fetchCompanies(pagination.current - 1)}
                >
                  Anterior
                </button>
                
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`page-btn ${pagination.current === page ? 'active' : ''}`}
                    onClick={() => fetchCompanies(page)}
                  >
                    {page}
                  </button>
                ))}
                
                <button 
                  className="page-btn"
                  disabled={pagination.current === pagination.pages}
                  onClick={() => fetchCompanies(pagination.current + 1)}
                >
                  Próximo
                </button>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '10px', color: '#6c757d', fontSize: '14px' }}>
              Mostrando {companies.length} de {pagination.total} empresas
            </div>
          </>
        )}
      </div>

      {/* Modal de Empresa */}
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
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginTop: 0 }}>
              {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
            </h2>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <h4 style={{ marginTop: '25px', marginBottom: '15px' }}>Informações Básicas</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Nome da Empresa *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CNPJ *</label>
                  <input
                    type="text"
                    name="cnpj"
                    value={formData.cnpj}
                    onChange={handleCNPJChange}
                    className="form-control"
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descrição</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  className="form-control"
                  rows={3}
                  placeholder="Descrição da empresa..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Setor</label>
                  <input
                    type="text"
                    name="sector"
                    value={formData.sector}
                    onChange={handleFormChange}
                    className="form-control"
                    placeholder="Tecnologia, Saúde, Educação..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Responsável</label>
                  <select
                    name="responsibleUser"
                    value={formData.responsibleUser}
                    onChange={handleFormChange}
                    className="form-control"
                    disabled={!isAdmin()}
                  >
                    <option value="">Selecione um responsável</option>
                    {users.filter(user => user.role === 'manager' || user.role === 'admin').map(user => (
                      <option key={user._id} value={user._id}>
                        {user.username} - {user.email} ({user.role === 'admin' ? 'Admin' : 'Gerente'})
                      </option>
                    ))}
                  </select>
                  {!isAdmin() && (
                    <small style={{ color: '#6c757d' }}>
                      Apenas administradores podem alterar o responsável
                    </small>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Funcionários</label>
                <select
                  name="employees"
                  multiple
                  value={formData.employees}
                  onChange={handleFormChange}
                  className="form-control"
                  style={{ height: '120px' }}
                  disabled={!isAdmin() && !canEditCompany(editingCompany)}
                >
                  {users.filter(user => user.role === 'user').map(user => (
                    <option key={user._id} value={user._id}>
                      {user.username} - {user.email}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#6c757d' }}>
                  {!isAdmin() && !canEditCompany(editingCompany) 
                    ? 'Apenas administradores ou responsáveis podem alterar funcionários'
                    : 'Segure Ctrl (Windows) ou Cmd (Mac) para selecionar múltiplos funcionários'
                  }
                </small>
              </div>

              <h4 style={{ marginTop: '25px', marginBottom: '15px' }}>Endereço</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Rua</label>
                  <input
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleFormChange}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Número</label>
                  <input
                    type="text"
                    name="address.number"
                    value={formData.address.number}
                    onChange={handleFormChange}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Complemento</label>
                  <input
                    type="text"
                    name="address.complement"
                    value={formData.address.complement}
                    onChange={handleFormChange}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Bairro</label>
                  <input
                    type="text"
                    name="address.neighborhood"
                    value={formData.address.neighborhood}
                    onChange={handleFormChange}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CEP</label>
                  <input
                    type="text"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleFormChange}
                    className="form-control"
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Cidade</label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleFormChange}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleFormChange}
                    className="form-control"
                    placeholder="SP, RJ, MG..."
                  />
                </div>
              </div>

              <h4 style={{ marginTop: '25px', marginBottom: '15px' }}>Contato</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input
                    type="tel"
                    name="contact.phone"
                    value={formData.contact.phone}
                    onChange={handleFormChange}
                    className="form-control"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="contact.email"
                    value={formData.contact.email}
                    onChange={handleFormChange}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input
                    type="url"
                    name="contact.website"
                    value={formData.contact.website}
                    onChange={handleFormChange}
                    className="form-control"
                    placeholder="https://www.empresa.com"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                <button type="submit" className="btn btn-primary">
                  {editingCompany ? 'Atualizar' : 'Criar'} Empresa
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Funcionários */}
      {showEmployeesModal && selectedCompany && (
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
              Funcionários - {selectedCompany.name}
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <p><strong>CNPJ:</strong> {selectedCompany.cnpj}</p>
              {selectedCompany.responsibleUser && (
                <p><strong>Responsável:</strong> {selectedCompany.responsibleUser.username || selectedCompany.responsibleUser}</p>
              )}
            </div>

            {selectedCompany.employees && selectedCompany.employees.length > 0 ? (
              <div>
                <h4>Lista de Funcionários:</h4>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCompany.employees.map(employee => (
                      <tr key={employee._id || employee}>
                        <td>{employee.username || employee}</td>
                        <td>{employee.email || '-'}</td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            backgroundColor: employee.isActive !== false ? 'var(--success-color)' : 'var(--muted-color)',
                            color: 'white'
                          }}>
                            {employee.isActive !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert">
                <p>Nenhum funcionário cadastrado nesta empresa.</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
              <button type="button" className="btn btn-secondary" onClick={closeEmployeesModal}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;