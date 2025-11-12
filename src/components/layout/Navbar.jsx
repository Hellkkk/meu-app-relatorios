import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { user, logout, isAdmin, isAdminOrManager, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  const getRoleColor = (role) => {
    const colors = {
      'admin': 'var(--role-admin)',
      'manager': 'var(--role-manager)',
      'user': 'var(--role-user)'
    };
    return colors[role] || 'var(--muted-color)';
  };

  const getRoleIcon = (role) => {
    const icons = {
      'admin': 'A',
      'manager': 'M',
      'user': 'U'
    };
    return icons[role] || 'U';
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/dashboard" className="navbar-brand">
          App Relatórios
        </Link>
        
        <div className="navbar-nav">
          <Link to="/dashboard" className="nav-link">
            Dashboard
          </Link>
          
          {isAdminOrManager() && (
            <Link to="/companies" className="nav-link">
              Empresas
            </Link>
          )}
          
          <Link to="/reports" className="nav-link">
            Relatórios
          </Link>
          
          {isAdmin() && (
            <>
              <Link to="/admin/users" className="nav-link">
                Usuários
              </Link>
              <Link to="/admin/user-company-links" className="nav-link">
                Vínculos
              </Link>
            </>
          )}
        </div>
        
        <div className="user-profile">
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div 
              className="user-pill"
              style={{ 
                borderColor: `${getRoleColor(user.role)}30`
              }}
            >
              <div 
                className="user-avatar"
                style={{
                  background: `linear-gradient(135deg, ${getRoleColor(user.role)}, ${getRoleColor(user.role)}dd)`
                }}
              >
                {getRoleIcon(user.role)}
              </div>
              <div className="user-info">
                <div className="user-name">
                  {user.profile?.firstName || user.username}
                </div>
                <div className="user-role">
                  {user.role === 'admin' ? 'Administrador' : user.role === 'manager' ? 'Gerente' : 'Usuário'}
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.85rem',
                borderRadius: '50px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                background: 'rgba(108, 117, 125, 0.1)',
                border: '1px solid rgba(108, 117, 125, 0.3)',
                transition: 'all 0.2s ease',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(108, 117, 125, 0.2)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(108, 117, 125, 0.1)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;