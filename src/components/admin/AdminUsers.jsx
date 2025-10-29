import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import UserCompanyManager from './UserCompanyManager';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showCompanyManager, setShowCompanyManager] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    role: 'user'
  });

  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/users');
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setError('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post('/api/admin/users', formData);
      if (response.data.success) {
        await fetchUsers();
        setShowUserForm(false);
        setFormData({
          username: '',
          email: '',
          password: '',
          name: '',
          role: 'user'
        });
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      setError(error.response?.data?.message || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      setLoading(true);
      const response = await axios.put(`/api/admin/users/${userId}`, updates);
      if (response.data.success) {
        await fetchUsers();
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      setError('Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    
    try {
      setLoading(true);
      const response = await axios.delete(`/api/admin/users/${userId}`);
      if (response.data.success) {
        await fetchUsers();
      }
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      setError('Erro ao deletar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    await handleUpdateUser(userId, { isActive: !isActive });
  };

  const openCompanyManager = (user) => {
    setSelectedUser(user);
    setShowCompanyManager(true);
  };

  const closeCompanyManager = () => {
    setSelectedUser(null);
    setShowCompanyManager(false);
    fetchUsers(); // Recarregar para atualizar vínculos
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading && (!users || users.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Carregando usuários...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Gerenciamento de Usuários
        </h1>
        <button
          onClick={() => setShowUserForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          + Novo Usuário
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Formulário de criação de usuário */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Criar Novo Usuário</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
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
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
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
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Função
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="user">Usuário</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de usuários */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Função
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empresas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(users) && users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || user.username}
                      </div>
                      <div className="text-sm text-gray-500">@{user.username}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Gerente' : 'Usuário'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-900">
                        {user.companies?.length || 0} empresa(s)
                      </span>
                      <button
                        onClick={() => openCompanyManager(user)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Gerenciar
                      </button>
                    </div>
                    {user.companies && user.companies.length > 0 && (
                      <div className="mt-1">
                        <div className="flex flex-wrap gap-1">
                          {user.companies.slice(0, 2).map((company) => (
                            <span
                              key={company._id}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                            >
                              {company.name}
                            </span>
                          ))}
                          {user.companies.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{user.companies.length - 2} mais
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(user._id, user.isActive)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {currentUser?.role === 'admin' && user._id !== currentUser._id && (
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">Nenhum usuário encontrado</div>
          <button
            onClick={() => setShowUserForm(true)}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Criar Primeiro Usuário
          </button>
        </div>
      )}

      {/* Modal de gerenciamento de empresas */}
      <UserCompanyManager
        isOpen={showCompanyManager}
        onClose={closeCompanyManager}
        user={selectedUser}
        type="user"
        onUpdate={fetchUsers}
      />
    </div>
  );
};

export default AdminUsers;