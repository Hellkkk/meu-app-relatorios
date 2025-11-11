import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UserCompanyManager from '../admin/UserCompanyManagerFixed';
import { useAuth } from '../../contexts/AuthContext';

const AddCompanyModal = ({ isOpen, onClose, formData, setFormData, onSubmit, loading }) => {
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Criar Nova Empresa</h2>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            Fechar
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Nome da Empresa</label>
            <input
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Documento (CPF)</label>
            <input
              type="text"
              className="form-control"
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Endereço</label>
            <input
              type="text"
              className="form-control"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input
              type="text"
              className="form-control"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditCompanyModal = ({ isOpen, onClose, formData, setFormData, onSubmit, loading }) => {
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Editar Empresa</h2>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            Fechar
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Nome da Empresa</label>
            <input
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Documento (CPF)</label>
            <input
              type="text"
              className="form-control"
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Endereço</label>
            <input
              type="text"
              className="form-control"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input
              type="text"
              className="form-control"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Utilitário: formata documento para CPF (11 dígitos) como XXX.XXX.XXX-XX
function formatCPF(value) {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length !== 11) return value || '';
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

// Formata objeto de endereço em string amigável
function formatAddress(addr) {
  if (!addr || typeof addr !== 'object') return '';
  const { street, number, complement, neighborhood, city, state, zipCode } = addr;
  const parts = [];
  if (street) parts.push(street);
  if (number) parts.push(number);
  if (complement) parts.push(complement);
  if (neighborhood) parts.push(neighborhood);
  const cityState = [city, state].filter(Boolean).join(' - ');
  if (cityState) parts.push(cityState);
  if (zipCode) parts.push(zipCode);
  return parts.join(', ');
}

const CompaniesFixed = () => {
  const { user, isAdmin, isManager } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', cnpj: '', address: '', phone: '', email: '' });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      // Buscar apenas empresas ativas
      const response = await axios.get('/api/companies?limit=1000&isActive=true');
      if (response.data.success) {
        const companiesData = Array.isArray(response.data.data?.companies) ? response.data.data.companies : [];
        setCompanies(companiesData);
      } else {
        setCompanies([]);
      }
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      setError('Erro ao carregar empresas');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Validação básica do documento (agora 11 dígitos)
      const docDigits = (formData.cnpj || '').replace(/\D/g, '');
      if (docDigits.length !== 11) {
        setError('Documento inválido. Informe 11 dígitos.');
        setLoading(false);
        return;
      }

      // Monta payload conforme o backend espera
      const cnpjFormatted = formatCPF(formData.cnpj);
      const addressObj = formData.address ? { street: formData.address } : undefined;
      const contactObj = {};
      if (formData.phone) contactObj.phone = formData.phone;
      if (formData.email) contactObj.email = formData.email;

      const payload = {
        name: (formData.name || '').trim(),
        cnpj: cnpjFormatted,
        ...(addressObj ? { address: addressObj } : {}),
        ...(Object.keys(contactObj).length ? { contact: contactObj } : {}),
      };

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/companies', payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (response.data.success) {
        setShowCompanyForm(false);
        setFormData({ name: '', cnpj: '', address: '', phone: '', email: '' });
        fetchCompanies();
      }
    } catch (error) {
      const apiMsg = error.response?.data?.message;
      const detail = error.response?.data?.error;
      const fullMsg = apiMsg ? `${apiMsg}${detail ? `: ${detail}` : ''}` : '';
      console.error('Erro ao criar empresa (detalhes):', error.response?.data || error);
      // Ajuda adicional quando o backend ainda exige CNPJ
      if (detail?.includes('CNPJ deve estar no formato') || apiMsg?.includes('CNPJ deve estar no formato')) {
        setError('O servidor ainda está na versão antiga que exige CNPJ. Publique o backend atualizado para aceitar CPF ou use um CNPJ válido temporariamente.');
      } else {
        setError(fullMsg || 'Erro ao criar empresa');
      }
    } finally {
      setLoading(false);
    }
  };

  const openEditForCompany = (company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name || '',
      cnpj: company.cnpj || '',
      address: typeof company.address === 'object' ? formatAddress(company.address) : (company.address || ''),
      phone: company.contact?.phone || company.phone || '',
      email: company.contact?.email || company.email || '',
    });
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setShowEditModal(false);
    setSelectedCompany(null);
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    if (!selectedCompany?._id) return;
    try {
      setLoading(true);
      // Monta payload conforme o backend espera
      const cnpjFormatted = formatCPF(formData.cnpj);
      const addressObj = formData.address ? { street: formData.address } : undefined;
      const contactObj = {};
      if (formData.phone) contactObj.phone = formData.phone;
      if (formData.email) contactObj.email = formData.email;

      const payload = {
        name: (formData.name || '').trim(),
        ...(cnpjFormatted ? { cnpj: cnpjFormatted } : {}),
        ...(addressObj ? { address: addressObj } : {}),
        ...(Object.keys(contactObj).length ? { contact: contactObj } : {}),
      };

      const token = localStorage.getItem('token');
      const res = await axios.put(`/api/companies/${selectedCompany._id}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.data?.success) {
        await fetchCompanies();
        closeEdit();
        setError('');
      }
    } catch (err) {
      const apiMsg = err.response?.data?.message;
      const detail = err.response?.data?.error;
      console.error('Erro ao atualizar empresa (detalhes):', err.response?.data || err);
      if (err.response?.status === 403) {
        setError(apiMsg || 'Acesso negado. Apenas administradores ou responsáveis podem editar esta empresa.');
      } else {
        setError(apiMsg ? `${apiMsg}${detail ? `: ${detail}` : ''}` : 'Erro ao atualizar empresa');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta empresa?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/companies/${id}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      fetchCompanies();
    } catch (error) {
      const apiMsg = error.response?.data?.message;
      const detail = error.response?.data?.error;
      console.error('Erro ao deletar empresa (detalhes):', error.response?.data || error);
      if (error.response?.status === 403) {
        setError(apiMsg || 'Acesso negado. Apenas administradores podem excluir empresas.');
      } else {
        setError(apiMsg ? `${apiMsg}${detail ? `: ${detail}` : ''}` : 'Erro ao deletar empresa');
      }
    }
  };

  const openUserManager = (company) => {
    setSelectedCompany(company);
    setShowUserManager(true);
  };

  const closeUserManager = () => {
    setShowUserManager(false);
    setSelectedCompany(null);
    fetchCompanies(); // Recarrega para atualizar os v\u00ednculos
  };

  const canManageUsersForCompany = (company) => {
    if (isAdmin && isAdmin()) return true;
    if (isManager && isManager()) {
      const responsibleId = company?.responsibleUser?._id || company?.responsibleUser;
      return responsibleId && user?._id && responsibleId.toString() === user._id.toString();
    }
    return false;
  };

  if (loading && (!companies || companies.length === 0)) {
    return (
      <div className="container">
        <div className="loading">Carregando empresas...</div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in-up">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Gerenciamento de Empresas</h1>
        <p style={{ color: 'var(--medium-gray)' }}>
          Gerencie todas as empresas e seus vínculos com usuários
        </p>
      </div>

      {/* Action Button: somente Admin pode criar */}
      {isAdmin && isAdmin() && (
        <div style={{ marginBottom: '2rem', display: 'block', width: '100%', overflow: 'visible', position: 'relative', zIndex: 2001 }}>
          <button
            onClick={() => setShowCompanyForm(true)}
            className="btn btn-primary"
            style={{ display: 'inline-block', padding: '1rem 2rem', minHeight: '48px', fontSize: '1rem', fontWeight: '500', whiteSpace: 'nowrap', position: 'relative', zIndex: 2001 }}
          >
            + Nova Empresa
          </button>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {/* Modal de Criação de Empresa (somente Admin) */}
      {isAdmin && isAdmin() && (
        <AddCompanyModal
          isOpen={showCompanyForm}
          onClose={() => setShowCompanyForm(false)}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreateCompany}
          loading={loading}
        />
      )}

      {/* Lista de Empresas */}
      <div className="grid-3">
        {Array.isArray(companies) &&
          companies.map((company) => (
            <div key={company._id} className="card">
              <h2>{company.name}</h2>

              {company.cnpj && (
                <p>
                  <strong>Documento:</strong> {company.cnpj}
                </p>
              )}

              {company.address && typeof company.address === 'object' && (
                <p>
                  <strong>Endereço:</strong> {formatAddress(company.address)}
                </p>
              )}

              {(company.contact?.phone || company.phone) && (
                <p>
                  <strong>Telefone:</strong> {company.contact?.phone || company.phone}
                </p>
              )}

              {(company.contact?.email || company.email) && (
                <p>
                  <strong>Email:</strong> {company.contact?.email || company.email}
                </p>
              )}

              <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#f3f4f6', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  <strong>Funcionários:</strong> {company.employees?.length || 0}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {(isAdmin && isAdmin()) || (isManager && isManager()) ? (
                  <button
                    onClick={() => openEditForCompany(company)}
                    className="btn btn-secondary"
                    style={{ flex: 1, minWidth: '120px' }}
                    title="Editar Empresa"
                  >
                    Editar
                  </button>
                ) : null}

                {canManageUsersForCompany(company) && (
                  <button
                    onClick={() => openUserManager(company)}
                    className="btn btn-info"
                    style={{ flex: 1, minWidth: '120px' }}
                    title="Gerenciar Usuários"
                  >
                    Gerenciar Usuários
                  </button>
                )}

                {isAdmin && isAdmin() && (
                  <button onClick={() => handleDeleteCompany(company._id)} className="btn btn-danger" title="Excluir Empresa">
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {companies.length === 0 && !loading && (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#6b7280' }}>
            {isAdmin && isAdmin() ? 'Nenhuma empresa encontrada. Clique em "+ Nova Empresa" para começar.' : 'Nenhuma empresa encontrada.'}
          </p>
        </div>
      )}

      {/* Modal de Gerenciamento de Usuários */}
      {showUserManager && selectedCompany && (
        <UserCompanyManager isOpen={showUserManager} onClose={closeUserManager} company={selectedCompany} type="company" onUpdate={fetchCompanies} />
      )}

      {/* Modal de Edição de Empresa (admin ou gerente responsável) */}
      <EditCompanyModal
        isOpen={showEditModal}
        onClose={closeEdit}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleUpdateCompany}
        loading={loading}
      />
    </div>
  );
};

export default CompaniesFixed;
