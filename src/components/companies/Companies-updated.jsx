import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UserCompanyManager from '../admin/UserCompanyManager';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/companies');
      if (response.data.success) {
        setCompanies(response.data.companies);
      }
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      setError('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post('/api/companies', formData);
      if (response.data.success) {
        await fetchCompanies();
        setShowCompanyForm(false);
        setFormData({
          name: '',
          cnpj: '',
          address: '',
          phone: '',
          email: ''
        });
      }
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      setError(error.response?.data?.message || 'Erro ao criar empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCompany = async (companyId, updates) => {
    try {
      setLoading(true);
      const response = await axios.put(`/api/companies/${companyId}`, updates);
      if (response.data.success) {
        await fetchCompanies();
      }
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      setError('Erro ao atualizar empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (companyId) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;
    
    try {
      setLoading(true);
      const response = await axios.delete(`/api/companies/${companyId}`);
      if (response.data.success) {
        await fetchCompanies();
      }
    } catch (error) {
      console.error('Erro ao deletar empresa:', error);
      setError('Erro ao deletar empresa');
    } finally {
      setLoading(false);
    }
  };

  const openUserManager = (company) => {
    setSelectedCompany(company);
    setShowUserManager(true);
  };

  const closeUserManager = () => {
    setSelectedCompany(null);
    setShowUserManager(false);
    fetchCompanies(); // Recarregar para atualizar vínculos
  };

  const formatCNPJ = (cnpj) => {
    if (!cnpj) return '';
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  if (loading && companies.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Carregando empresas...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Gerenciamento de Empresas
        </h1>
        <button
          onClick={() => setShowCompanyForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          + Nova Empresa
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Formulário de criação de empresa */}
      {showCompanyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Criar Nova Empresa</h2>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCompanyForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Criando...' : 'Criar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de empresas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <div key={company._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-800 line-clamp-2">
                {company.name}
              </h2>
              <div className="flex space-x-1">
                <button
                  onClick={() => openUserManager(company)}
                  className="text-blue-600 hover:text-blue-800 p-1"
                  title="Gerenciar Usuários"
                >
                  👥
                </button>
                <button
                  onClick={() => handleDeleteCompany(company._id)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Excluir Empresa"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              {company.cnpj && (
                <div>
                  <span className="font-medium">CNPJ:</span> {formatCNPJ(company.cnpj)}
                </div>
              )}
              {company.email && (
                <div>
                  <span className="font-medium">Email:</span> {company.email}
                </div>
              )}
              {company.phone && (
                <div>
                  <span className="font-medium">Telefone:</span> {company.phone}
                </div>
              )}
              {company.address && (
                <div>
                  <span className="font-medium">Endereço:</span> 
                  <div className="text-xs mt-1 text-gray-500 line-clamp-2">
                    {company.address}
                  </div>
                </div>
              )}
            </div>

            {/* Informações de usuários vinculados */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Funcionários:</span> {company.employees?.length || 0}
                </div>
                <button
                  onClick={() => openUserManager(company)}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                >
                  Gerenciar Usuários
                </button>
              </div>
              
              {company.employees && company.employees.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">Últimos funcionários:</div>
                  <div className="flex flex-wrap gap-1">
                    {company.employees.slice(0, 3).map((employee) => (
                      <span
                        key={employee._id}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                      >
                        {employee.name || employee.username}
                      </span>
                    ))}
                    {company.employees.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{company.employees.length - 3} mais
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 text-xs text-gray-400">
              Criada em: {new Date(company.createdAt).toLocaleDateString('pt-BR')}
            </div>
          </div>
        ))}
      </div>

      {companies.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">Nenhuma empresa encontrada</div>
          <button
            onClick={() => setShowCompanyForm(true)}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Criar Primeira Empresa
          </button>
        </div>
      )}

      {/* Modal de gerenciamento de usuários */}
      <UserCompanyManager
        isOpen={showUserManager}
        onClose={closeUserManager}
        company={selectedCompany}
        type="company"
        onUpdate={fetchCompanies}
      />
    </div>
  );
};

export default Companies;