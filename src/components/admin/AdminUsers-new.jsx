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
        const usersData = Array.isArray(response.data.users) 
          ? response.data.users 
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
        <div>
          <h1>👥 Gerenciamento de Usuários</h1>
          <p className="page-subtitle" style={{ color: 'var(--medium-gray)', fontSize: '1rem', marginTop: '0.5rem' }}>
            Gerencie todos os usuários e seus vínculos com empresas
          </p>
        </div>
        <button onClick={() => setShowUserForm(true)} className="btn btn-primary">
          + Novo Usuário
        </button>
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {/* Modal de Criação de Usuário */}
      {showUserForm && (
        <div className="modal-backdrop" onClick={() => setShowUserForm(false)}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', margin: '50px auto' }}>
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
        <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Usuário</th>
                <th style={{ width: '20%' }}>Email</th>
                <th style={{ width: '12%' }}>Função</th>
                <th style={{ width: '18%' }}>Empresas</th>
                <th style={{ width: '10%' }}>Status</th>
                <th style={{ width: '25%', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(users) && users.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div>
                      <strong>{user.name || user.username}</strong>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>@{user.username}</div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.9rem' }}>{user.email}</td>
                  <td>
                    <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                      {getRoleDisplay(user.role)}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.9rem' }}>{user.companies?.length || 0} empresa(s)</div>
                  </td>
                  <td>
                    <span className={`badge ${user.isActive ? 'status-success' : 'status-secondary'}`} style={{ fontSize: '0.8rem' }}>
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button className="btn btn-sm btn-primary" onClick={() => openCompanyManager(user)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Gerenciar</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => openCompanyManager(user)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Vínculos</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteUser(user._id)} disabled={user._id === currentUser?._id} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
