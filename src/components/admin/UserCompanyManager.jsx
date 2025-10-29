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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            Gerenciar {itemLabel} - {entityName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Lista atual de vínculos */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">
            {itemLabel} Vinculadas ({currentItems.length})
          </h3>
          {currentItems.length > 0 ? (
            <div className="space-y-2">
              {currentItems.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <span className="font-medium">
                      {type === 'user' ? item.name : item.name || item.username}
                    </span>
                    {type === 'user' && item.cnpj && (
                      <span className="text-sm text-gray-500 ml-2">
                        CNPJ: {item.cnpj}
                      </span>
                    )}
                    {type === 'company' && item.email && (
                      <span className="text-sm text-gray-500 ml-2">
                        {item.email}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveLink(item._id)}
                    disabled={loading}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhum vínculo encontrado</p>
          )}
        </div>

        {/* Adicionar novo vínculo */}
        <div>
          <h3 className="text-lg font-medium mb-3">
            Adicionar Novo Vínculo
          </h3>
          {availableItems.length > 0 ? (
            <div className="flex gap-3">
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="flex-1 p-2 border rounded-lg"
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
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          ) : (
            <p className="text-gray-500">
              {loading 
                ? 'Carregando...' 
                : `Todas as ${type === 'user' ? 'empresas' : 'usuários'} já estão vinculadas`
              }
            </p>
          )}
        </div>

        {/* Botão fechar */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserCompanyManager;