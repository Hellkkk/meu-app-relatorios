import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import UserCompanyManager from './UserCompanyManagerFixed';

const AddUserModal = ({ isOpen, onClose, formData, setFormData, onSubmit, loading }) => {
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
          <h2>Criar Novo Usuário</h2>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            Fechar
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Nome</label>
            <input
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password"
              className="form-control"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Função</label>
            <select
              className="form-control"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
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
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

const EditUserModal = ({ isOpen, onClose, formData, setFormData, onSubmit, loading, onOpenLinks }) => {
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
          <h2>Editar Usuário</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onOpenLinks} className="btn btn-info" style={{ padding: '0.5rem 1rem' }}>
              Gerenciar Vínculos
            </button>
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              Fechar
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Nome</label>
            <input
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha (deixe em branco para manter)</label>
            <input
              type="password"
              className="form-control"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder=""
            />
          </div>

          <div className="form-group">
            <label className="form-label">Função</label>
            <select
              className="form-control"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            >
              <option value="user">Usuário</option>
              <option value="manager">Gerente</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showCompanyManager, setShowCompanyManager] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', name: '', role: 'user' });

  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/users?limit=1000');
      if (response.data?.success) {
        const usersData = Array.isArray(response.data.data?.users) ? response.data.data.users : [];
        setUsers(usersData);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
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
      const payload = {
        name: (formData.name || '').trim(),
        username: (formData.username || '').trim(),
        email: (formData.email || '').trim(),
        password: formData.password,
        role: formData.role || 'user',
      };
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/admin/users', payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (response.data?.success) {
        await fetchUsers();
        setShowUserForm(false);
        setFormData({ username: '', email: '', password: '', name: '', role: 'user' });
        setError('');
      }
    } catch (err) {
      console.error('Erro ao criar usuário (detalhes):', err?.response?.data || err);
      const apiMsg = err.response?.data?.message;
      const detail = err.response?.data?.error;
      setError(apiMsg ? `${apiMsg}${detail ? `: ${detail}` : ''}` : 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser?._id) return;
    try {
      setLoading(true);
      const payload = {
        name: (formData.name || '').trim(),
        username: (formData.username || '').trim(),
        email: (formData.email || '').trim(),
        role: formData.role || 'user',
      };
      if (formData.password && formData.password.trim().length > 0) {
        payload.password = formData.password;
      }
      const token = localStorage.getItem('token');
      const res = await axios.put(`/api/admin/users/${selectedUser._id}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.data?.success) {
        await fetchUsers();
        closeEdit();
        setFormData({ username: '', email: '', password: '', name: '', role: 'user' });
        setError('');
      }
    } catch (err) {
      console.error('Erro ao atualizar usuário (detalhes):', err?.response?.data || err);
      const apiMsg = err.response?.data?.message;
      const detail = err.response?.data?.error;
      setError(apiMsg ? `${apiMsg}${detail ? `: ${detail}` : ''}` : 'Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      await axios.patch(`/api/admin/users/${userId}/toggle-active`);
      fetchUsers();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      setError('Erro ao alterar status do usuário');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      fetchUsers();
    } catch (err) {
      console.error('Erro ao deletar usuário:', err);
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
    fetchUsers();
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'status-danger';
      case 'manager':
        return 'status-warning';
      default:
        return 'status-info';
    }
  };

  const getRoleDisplay = (role) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Gerente';
      default:
        return 'Usuário';
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
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Gerenciamento de Usuários</h1>
        <p style={{ color: 'var(--medium-gray)' }}>
          Gerencie todos os usuários e seus vínculos com empresas
        </p>
      </div>

      <div style={{ marginBottom: '2rem', display: 'block', width: '100%', overflow: 'visible', position: 'relative', zIndex: 2001 }}>
        <button
          onClick={() => setShowUserForm(true)}
          className="btn btn-primary"
          style={{ display: 'inline-block', padding: '1rem 2rem', minHeight: '48px', fontSize: '1rem', fontWeight: '500', whiteSpace: 'nowrap', position: 'relative', zIndex: 2001 }}
        >
          + Novo Usuário
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <AddUserModal
        isOpen={showUserForm}
        onClose={() => setShowUserForm(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleCreateUser}
        loading={loading}
      />

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
            {Array.isArray(users) &&
              users.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div>
                      <div>
                        <strong>{user.name || user.username}</strong>
                      </div>
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
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => openEdit(user) || setFormData({
                            name: user.name || '',
                            username: user.username || '',
                            email: user.email || '',
                            password: '',
                            role: user.role || 'user',
                          })}
                          className="btn btn-primary"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                        >
                          Gerenciar
                        </button>
                        <button
                          onClick={() => openCompanyManager(user)}
                          className="btn btn-info"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                          title="Gerenciar Vínculos"
                        >
                          Vínculos
                        </button>
                      </div>
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

      {showCompanyManager && selectedUser && (
        <UserCompanyManager
          isOpen={showCompanyManager}
          onClose={closeCompanyManager}
          user={selectedUser}
          type="user"
          onUpdate={fetchUsers}
        />
      )}

      {/* Modal de edição de usuário */}
      <EditUserModal
        isOpen={showEditModal}
        onClose={closeEdit}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleUpdateUser}
        loading={loading}
        onOpenLinks={() => {
          if (selectedUser) {
            setShowEditModal(false);
            setShowCompanyManager(true);
          }
        }}
      />
    </div>
  );
};

export default AdminUsers;
