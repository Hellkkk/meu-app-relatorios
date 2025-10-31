import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';

const UserCompanyManager = ({
  isOpen,
  onClose,
  user,
  type = 'user', // 'user' or 'company'
  company,
  onUpdate,
}) => {
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (type === 'user' && user) {
      fetchAvailableCompanies();
    } else if (type === 'company' && company) {
      fetchAvailableUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type, user?._id, company?._id]);

  const fetchAvailableCompanies = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/companies?limit=1000');
      if (response.data?.success) {
        const userCompanyIds = user?.companies?.map((c) => c._id) || [];
        const companiesList = response.data.data?.companies || [];
        const available = companiesList.filter((c) => !userCompanyIds.includes(c._id));
        setAvailableCompanies(available);
      }
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/users?limit=1000');
      if (response.data?.success) {
        const companyUserIds = company?.employees?.map((u) => u._id) || [];
        const usersList = response.data.data?.users || [];
        const available = usersList.filter((u) => u.isActive && !companyUserIds.includes(u._id));
        setAvailableUsers(available);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async () => {
    if (!selectedItemId) return;
    try {
      setLoading(true);
      if (type === 'user') {
        await axios.post(`/api/admin/users/${user._id}/companies/${selectedItemId}`);
      } else {
        await axios.post(`/api/companies/${company._id}/employees/${selectedItemId}`);
      }
      setSelectedItemId('');
      onUpdate?.();
      if (type === 'user') {
        fetchAvailableCompanies();
      } else {
        fetchAvailableUsers();
      }
    } catch (error) {
      console.error('Erro ao adicionar vínculo:', error);
      alert('Erro ao adicionar vínculo');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLink = async (itemId) => {
    try {
      setLoading(true);
      if (type === 'user') {
        await axios.delete(`/api/admin/users/${user._id}/companies/${itemId}`);
      } else {
        await axios.delete(`/api/companies/${company._id}/employees/${itemId}`);
      }
      onUpdate?.();
      if (type === 'user') {
        fetchAvailableCompanies();
      } else {
        fetchAvailableUsers();
      }
    } catch (error) {
      console.error('Erro ao remover vínculo:', error);
      alert('Erro ao remover vínculo');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentItems =
    type === 'user'
      ? Array.isArray(user?.companies)
        ? user.companies
        : []
      : Array.isArray(company?.employees)
      ? company.employees
      : [];

  const availableItems =
    type === 'user'
      ? Array.isArray(availableCompanies)
        ? availableCompanies
        : []
      : Array.isArray(availableUsers)
      ? availableUsers
      : [];

  const itemLabel = type === 'user' ? 'Empresas' : 'Usu\u00e1rios';
  const entityName = type === 'user' ? (user?.name || user?.username || 'Usu\u00e1rio') : (company?.name || 'Empresa');
  const titleText = (type === 'user' ? 'Gerenciar Empresas' : 'Gerenciar Usu\u00e1rios');
  const linkedHeader = (type === 'user' ? 'Empresas vinculadas' : 'Usu\u00e1rios vinculados');

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
          top: '44%', // raise a bit more as requested
          transform: 'translate(-50%, -50%)',
          zIndex: 6001,
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>{titleText} - {entityName}</h2>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            Fechar
          </button>
        </div>

  {/* Lista atual de v\u00ednculos */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '1rem' }}>
            {linkedHeader} ({currentItems.length})
          </h3>
          {currentItems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {currentItems.map((item) => (
                <div
                  key={item._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 500 }}>
                      {type === 'user' ? item.name : item.name || item.username}
                    </span>
                    {type === 'user' && item.cnpj && (
                      <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                        CNPJ: {item.cnpj}
                      </span>
                    )}
                    {type === 'company' && item.email && (
                      <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                        {item.email}
                      </span>
                    )}
                  </div>
                  <button onClick={() => handleRemoveLink(item._id)} disabled={loading} className="btn btn-danger" style={{ padding: '0.5rem 1rem' }}>
                    Remover
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280' }}>Nenhum vínculo encontrado</p>
          )}
        </div>

  {/* Adicionar novo v\u00ednculo */}
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '1rem' }}>Adicionar Novo Vínculo</h3>
          {availableItems.length > 0 ? (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="form-control"
                style={{ flex: 1 }}
                disabled={loading}
              >
                <option value="">Selecione {type === 'user' ? 'uma empresa' : 'um usu\u00e1rio'}</option>
                {availableItems.map((item) => (
                  <option key={item._id} value={item._id}>
                    {type === 'user'
                      ? `${item.name} ${item.cnpj ? `(${item.cnpj})` : ''}`
                      : `${item.name || item.username} (${item.email})`}
                  </option>
                ))}
              </select>
              <button onClick={handleAddLink} disabled={!selectedItemId || loading} className="btn btn-primary">
                {loading ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          ) : (
            <p style={{ color: '#6b7280' }}>
              {loading ? 'Carregando...' : `Todas as ${type === 'user' ? 'empresas' : 'usu\u00e1rios'} j\u00e1 est\u00e3o vinculadas`}
            </p>
          )}
        </div>

        {/* Botão fechar */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">Fechar</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UserCompanyManager;
