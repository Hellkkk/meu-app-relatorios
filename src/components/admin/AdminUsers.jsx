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
      const response = await axios.get('/api/admin/users?limit=1000');
      if (response.data.success) {
        const usersData = Array.isArray(response.data.data?.users) 
          ? response.data.data.users 
          : [];
        setUsers(usersData);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setError('Erro ao carregar usuários');
      setUsers([]);
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

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await axios.patch(`/api/admin/users/${userId}/toggle-active`);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      setError('Erro ao alterar status do usuário');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      await axios.delete(`/api/admin/users/${userId}`);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      setError('Erro ao deletar usuário');
    }
  };

  const openCompanyManager = (user) => {
    setSelectedUser(user);
    setShowCompanyManager(true);
  };

  const closeCompanyManager = () => {
    setShowCompanyManager(false);
    setSelectedUser(null);
    fetchUsers(); // Recarrega para atualizar os vínculos
  };

  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'admin': return 'status-danger';
      case 'manager': return 'status-warning';
      default: return 'status-info';
    }
  };

  const getRoleDisplay = (role) => {
    switch(role) {
      case 'admin': return 'Admin';
      case 'manager': return 'Gerente';
      default: return 'Usuário';
    }
  };

  if (loading && (!users || users.length === 0)) {
    return (
      <div className="container">
        <div className="loading">Carregando usuários...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Gerenciamento de Usuários</h1>
        <button 
          onClick={() => setShowUserForm(true)} 
          className="btn btn-primary"
        >
          + Novo Usuário
        </button>
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {/* Modal de Criação de Usuário */}
      {showUserForm && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowUserForm(false)}
        >
          <div 
            className="card" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '500px', 
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative'
            }}
          >
            <h2>Criar Novo Usuário</h2>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Senha</label>
                <input
                  type="password"
                  className="form-control"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Função</label>
                <select
                  className="form-control"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  required
                >
                  <option value="user">Usuário</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Usuário'}
                </button>
                <button type="button" onClick={() => setShowUserForm(false)} className="btn btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabela de Usuários */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Email</th>
              <th>Função</th>
              <th>Empresas</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(users) && users.map((user) => (
              <tr key={user._id}>
                <td>
                  <div>
                    <div><strong>{user.name || user.username}</strong></div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>@{user.username}</div>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`status-indicator ${getRoleBadgeClass(user.role)}`}>
                    {getRoleDisplay(user.role)}
                  </span>
                </td>
                <td>
                  <div>
                    <div>{user.companies?.length || 0} empresa(s)</div>
                    <button
                      onClick={() => openCompanyManager(user)}
                      className="btn btn-info"
                      style={{ marginTop: '0.5rem', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                    >
                      Gerenciar
                    </button>
                  </div>
                </td>
                <td>
                  <button
                    onClick={() => handleToggleActive(user._id, user.isActive)}
                    className={`status-indicator ${user.isActive ? 'status-success' : 'status-danger'}`}
                    style={{ border: 'none', cursor: 'pointer' }}
                  >
                    {user.isActive ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td>
                  {user._id !== currentUser?._id && (
                    <button
                      onClick={() => handleDeleteUser(user._id)}
                      className="btn btn-danger"
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                    >
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && !loading && (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            Nenhum usuário encontrado. Clique em "+ Novo Usuário" para começar.
          </p>
        )}
      </div>

      {/* Modal de Gerenciamento de Empresas */}
      {showCompanyManager && selectedUser && (
        <UserCompanyManager
          isOpen={showCompanyManager}
          onClose={closeCompanyManager}
          user={selectedUser}
          type="user"
          onUpdate={fetchUsers}
        />
      )}
    </div>
  );
};

export default AdminUsers;
