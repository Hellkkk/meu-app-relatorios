import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserCompanyManager = ({ 
  isOpen, 
  onClose, 
  user, 
  type = 'user', // 'user' or 'company'
  company,
  onUpdate 
}) => {
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (type === 'user' && user) {
        fetchAvailableCompanies();
      } else if (type === 'company' && company) {
        fetchAvailableUsers();
      }
    }
  }, [isOpen, user, company, type]);

  const fetchAvailableCompanies = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/companies?limit=1000');
      if (response.data.success) {
        // Filtrar empresas que o usuário já não está vinculado
        const userCompanyIds = user?.companies?.map(c => c._id) || [];
        const companiesList = response.data.data?.companies || [];
        const available = companiesList.filter(
          company => !userCompanyIds.includes(company._id)
        );
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
      if (response.data.success) {
        // Filtrar usuários que já não estão na empresa
        const companyUserIds = company?.employees?.map(u => u._id) || [];
        const usersList = response.data.data?.users || [];
        const available = usersList.filter(
          user => user.isActive && !companyUserIds.includes(user._id)
        );
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
        // Adicionar empresa ao usuário
        await axios.post(`/api/admin/users/${user._id}/companies/${selectedItemId}`);
      } else {
        // Adicionar usuário à empresa
        await axios.post(`/api/companies/${company._id}/employees/${selectedItemId}`);
      }
      
      setSelectedItemId('');
      onUpdate?.();
      
      // Atualizar listas
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
        // Remover empresa do usuário
        await axios.delete(`/api/admin/users/${user._id}/companies/${itemId}`);
      } else {
        // Remover usuário da empresa
        await axios.delete(`/api/companies/${company._id}/employees/${itemId}`);
      }
      
      onUpdate?.();
      
      // Atualizar listas
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

  // Garantir que sempre temos arrays válidos
  const currentItems = type === 'user'
    ? (Array.isArray(user?.companies) ? user.companies : [])
    : (Array.isArray(company?.employees) ? company.employees : []);

  const availableItems = type === 'user'
    ? (Array.isArray(availableCompanies) ? availableCompanies : [])
    : (Array.isArray(availableUsers) ? availableUsers : []);

  const itemLabel = type === 'user' ? 'Empresas' : 'Usuários';
  const entityName = type === 'user'
    ? user?.name || user?.username || 'Usuário'
    : company?.name || 'Empresa';  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '30vh',
        zIndex: 6000,
        width: '100vw',
        height: '100vh'
      }}
    >
      <div 
        className="card"
        style={{
          maxWidth: '800px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Gerenciar {itemLabel} - {entityName}</h2>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem' }}
          >
            ✕ Fechar
          </button>
        </div>

        {/* Lista atual de vínculos */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '1rem' }}>
            {itemLabel} Vinculadas ({currentItems.length})
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
                    borderRadius: '8px'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: '500' }}>
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
                  <button
                    onClick={() => handleRemoveLink(item._id)}
                    disabled={loading}
                    className="btn btn-danger"
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280' }}>Nenhum vínculo encontrado</p>
          )}
        </div>

        {/* Adicionar novo vínculo */}
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '1rem' }}>
            Adicionar Novo Vínculo
          </h3>
          {availableItems.length > 0 ? (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="form-control"
                style={{ flex: 1 }}
                disabled={loading}
              >
                <option value="">
                  Selecione {type === 'user' ? 'uma empresa' : 'um usuário'}
                </option>
                {availableItems.map((item) => (
                  <option key={item._id} value={item._id}>
                    {type === 'user'
                      ? `${item.name} ${item.cnpj ? `(${item.cnpj})` : ''}`
                      : `${item.name || item.username} (${item.email})`
                    }
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddLink}
                disabled={!selectedItemId || loading}
                className="btn btn-primary"
              >
                {loading ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          ) : (
            <p style={{ color: '#6b7280' }}>
              {loading
                ? 'Carregando...'
                : `Todas as ${type === 'user' ? 'empresas' : 'usuários'} já estão vinculadas`
              }
            </p>
          )}
        </div>

        {/* Botão fechar */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};export default UserCompanyManager;