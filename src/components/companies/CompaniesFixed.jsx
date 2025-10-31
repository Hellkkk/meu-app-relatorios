import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import UserCompanyManager from '../admin/UserCompanyManagerFixed';

const AddCompanyModal = ({ isOpen, onClose, formData, setFormData, onSubmit, loading }) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 6000,
        width: '100vw',
        height: '100vh',
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(800px, 92vw)',
          boxSizing: 'border-box',
          maxHeight: '80vh',
          overflowY: 'auto',
          position: 'fixed',
          left: '50%',
          top: '44%',
          transform: 'translate(-50%, -50%)',
          zIndex: 6001,
          padding: '1.25rem',
        }}
      >
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
            <label className="form-label">CNPJ</label>
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
    </div>,
    document.body
  );
};

// Utilitário: formata CNPJ para XX.XXX.XXX/XXXX-XX
function formatCNPJ(value) {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length !== 14) return value || '';
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

const CompaniesFixed = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);
  const [formData, setFormData] = useState({ name: '', cnpj: '', address: '', phone: '', email: '' });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/companies?limit=1000');
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
      // Validação básica do CNPJ
      const cnpjDigits = (formData.cnpj || '').replace(/\D/g, '');
      if (cnpjDigits.length !== 14) {
        setError('CNPJ inválido. Informe 14 dígitos.');
        setLoading(false);
        return;
      }

      // Monta payload conforme o backend espera
      const cnpjFormatted = formatCNPJ(formData.cnpj);
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

      const response = await axios.post('/api/companies', payload);
      if (response.data.success) {
        setShowCompanyForm(false);
        setFormData({ name: '', cnpj: '', address: '', phone: '', email: '' });
        fetchCompanies();
      }
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      setError('Erro ao criar empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta empresa?')) return;

    try {
      await axios.delete(`/api/companies/${id}`);
      fetchCompanies();
    } catch (error) {
      console.error('Erro ao deletar empresa:', error);
      setError('Erro ao deletar empresa');
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

  if (loading && (!companies || companies.length === 0)) {
    return (
      <div className="container">
        <div className="loading">Carregando empresas...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Gerenciamento de Empresas</h1>
        <p style={{ color: 'var(--medium-gray)' }}>
          Gerencie todas as empresas e seus vínculos com usuários
        </p>
      </div>

      {/* Action Button */}
      <div style={{ marginBottom: '2rem', display: 'block', width: '100%', overflow: 'visible', position: 'relative', zIndex: 2001 }}>
        <button
          onClick={() => setShowCompanyForm(true)}
          className="btn btn-primary"
          style={{ display: 'inline-block', padding: '1rem 2rem', minHeight: '48px', fontSize: '1rem', fontWeight: '500', whiteSpace: 'nowrap', position: 'relative', zIndex: 2001 }}
        >
          + Nova Empresa
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

  {/* Modal de Criação de Empresa */}
      <AddCompanyModal
        isOpen={showCompanyForm}
        onClose={() => setShowCompanyForm(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleCreateCompany}
        loading={loading}
      />

      {/* Lista de Empresas */}
      <div className="grid-3">
        {Array.isArray(companies) &&
          companies.map((company) => (
            <div key={company._id} className="card">
              <h2>{company.name}</h2>

              {company.cnpj && (
                <p>
                  <strong>CNPJ:</strong> {company.cnpj}
                </p>
              )}

              {company.address && (
                <p>
                  <strong>Endereço:</strong> {company.address}
                </p>
              )}

              {company.phone && (
                <p>
                  <strong>Telefone:</strong> {company.phone}
                </p>
              )}

              {company.email && (
                <p>
                  <strong>Email:</strong> {company.email}
                </p>
              )}

              <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#f3f4f6', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  <strong>Funcionários:</strong> {company.employees?.length || 0}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  onClick={() => openUserManager(company)}
                  className="btn btn-info"
                  style={{ flex: 1 }}
                  title="Gerenciar Usuários"
                >
                  Gerenciar Usuários
                </button>
                <button onClick={() => handleDeleteCompany(company._id)} className="btn btn-danger" title="Excluir Empresa">
                  Excluir
                </button>
              </div>
            </div>
          ))}
      </div>

      {companies.length === 0 && !loading && (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#6b7280' }}>
            Nenhuma empresa encontrada. Clique em "+ Nova Empresa" para come\u00e7ar.
          </p>
        </div>
      )}

      {/* Modal de Gerenciamento de Usu\u00e1rios */}
      {showUserManager && selectedCompany && (
        <UserCompanyManager isOpen={showUserManager} onClose={closeUserManager} company={selectedCompany} type="company" onUpdate={fetchCompanies} />
      )}
    </div>
  );
};

export default CompaniesFixed;
