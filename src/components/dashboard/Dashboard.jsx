import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const { user, isAdmin, isManager } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const endpoints = ['/api/reports/stats/overview'];
        
        if (isAdmin()) {
          endpoints.push('/api/companies/stats/overview', '/api/admin/stats/users');
        }

        const requests = endpoints.map(endpoint => 
          axios.get(endpoint).catch(err => ({ data: { success: false, error: err.message } }))
        );

        const responses = await Promise.all(requests);
        
        const statsData = {
          reports: responses[0].data.success ? responses[0].data.data : null
        };

        if (isAdmin() && responses.length > 1) {
          statsData.companies = responses[1].data.success ? responses[1].data.data : null;
          statsData.users = responses[2].data.success ? responses[2].data.data : null;
        }

        setStats(statsData);
      } catch (error) {
        setError('Erro ao carregar estatísticas');
        console.error('Stats error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin]);

  const getRoleDisplayName = (role) => {
    const roles = {
      'admin': 'Administrador',
      'manager': 'Gerente',
      'user': 'Usuário'
    };
    return roles[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      'admin': 'var(--role-admin)',
      'manager': 'var(--role-manager)',
      'user': 'var(--role-user)'
    };
    return colors[role] || 'var(--muted-color)';
  };

  if (loading) {
    return (
      <div className="hero-section">
        <div className="loading">
          <div className="loading-spinner"></div>
          Carregando seu dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* Hero Section */}
      <div className="hero-section" style={{ minHeight: '60vh', marginBottom: '2rem' }}>
        <div className="hero-content">
          <h1 className="hero-title">
            <span>Bem-vindo, {user.profile?.firstName || user.username}!</span> <span className="emoji">👋</span>
          </h1>
          <p className="hero-subtitle">
            Gerencie seus relatórios e empresas de forma inteligente e eficiente
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/reports" className="btn btn-hero">
              📊 Ver Relatórios
            </Link>
            {(isAdmin() || isManager()) && (
              <Link to="/companies" className="btn btn-secondary" style={{ borderRadius: '50px', padding: '1rem 2rem' }}>
                🏢 Gerenciar Empresas
              </Link>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error animate-fade-in-down">
          ⚠️ {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid-3 stagger-children" style={{ marginBottom: '2rem' }}>
        
        {/* Profile Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%', 
              background: `linear-gradient(135deg, ${getRoleColor(user.role)}, ${getRoleColor(user.role)}dd)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              marginRight: '1rem'
            }}>
              {(user.profile?.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <h3 style={{ margin: 0, color: getRoleColor(user.role) }}>Seu Perfil</h3>
              <div className="status-indicator" style={{ 
                background: `${getRoleColor(user.role)}20`,
                color: getRoleColor(user.role),
                marginTop: '0.5rem'
              }}>
                {getRoleDisplayName(user.role)}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
            <p><strong>📧 Email:</strong> {user.email}</p>
            <p><strong>📅 Membro desde:</strong> {new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
            {user.lastLogin && (
              <p><strong>🕒 Último acesso:</strong> {new Date(user.lastLogin).toLocaleString('pt-BR')}</p>
            )}
          </div>
        </div>

        {/* Companies Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ 
              fontSize: '2rem',
              marginRight: '1rem'
            }}>
              🏢
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'var(--success-color)' }}>Suas Empresas</h3>
              <div className="status-indicator status-success">
                {user.companies?.length || 0} empresa{(user.companies?.length || 0) !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          {user.companies && user.companies.length > 0 ? (
            <div>
              {user.companies.slice(0, 3).map((company, index) => (
                <div key={company._id || company} style={{ 
                  padding: '0.5rem',
                  margin: '0.5rem 0',
                  background: 'rgba(0, 208, 132, 0.1)',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}>
                  • {company.name || company}
                </div>
              ))}
              {user.companies.length > 3 && (
                <div style={{ fontSize: '0.9rem', color: '#6c757d', textAlign: 'center', marginTop: '1rem' }}>
                  +{user.companies.length - 3} empresas adicionais
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#6c757d', padding: '2rem' }}>
              {isAdmin() ? '🌟 Acesso a todas as empresas' : '📋 Nenhuma empresa associada'}
            </div>
          )}
        </div>

        {/* Reports Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ 
              fontSize: '2rem',
              marginRight: '1rem'
            }}>
              📊
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'var(--accent-color)' }}>Relatórios</h3>
              <div className="status-indicator status-info">
                {stats?.reports?.overview?.total || 0} relatório{(stats?.reports?.overview?.total || 0) !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          {stats?.reports?.overview?.byType?.length > 0 ? (
            <div>
              {stats.reports.overview.byType.slice(0, 3).map(type => (
                <div key={type._id} style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.5rem',
                  margin: '0.5rem 0',
                  background: 'rgba(56, 103, 214, 0.1)',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}>
                  <span>{type._id}</span>
                  <span style={{ fontWeight: 'bold' }}>{type.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#6c757d', padding: '2rem' }}>
              📈 Nenhum relatório encontrado
            </div>
          )}
        </div>

      </div>

      {/* Admin Stats */}
      {isAdmin() && (stats?.companies || stats?.users) && (
        <div className="grid-2 animate-fade-in-up" style={{ marginBottom: '2rem' }}>
          
          {stats?.companies && (
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ 
                  fontSize: '2rem',
                  marginRight: '1rem'
                }}>
                  🏭
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--warning-color)' }}>Estatísticas de Empresas</h3>
                  <div className="status-indicator status-warning">
                    Visão Administrativa
                  </div>
                </div>
              </div>
              <div className="grid-3" style={{ gap: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(243, 156, 18, 0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning-color)' }}>
                    {stats.companies.overview.total}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Total</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(0, 208, 132, 0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                    {stats.companies.overview.active}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Ativas</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(108, 117, 125, 0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--muted-color)' }}>
                    {stats.companies.overview.inactive}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Inativas</div>
                </div>
              </div>
            </div>
          )}

          {stats?.users && (
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ 
                  fontSize: '2rem',
                  marginRight: '1rem'
                }}>
                  👥
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--danger-color)' }}>Estatísticas de Usuários</h3>
                  <div className="status-indicator status-danger">
                    Painel Administrativo
                  </div>
                </div>
              </div>
              <div className="grid-4" style={{ gap: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(231, 76, 60, 0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>
                    {stats.users.overview.total}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Total</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(0, 208, 132, 0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                    {stats.users.overview.active}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Ativos</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(220, 53, 69, 0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--role-admin)' }}>
                    {stats.users.overview.admins || 0}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Admins</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(56, 103, 214, 0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                    {stats.users.overview.users || 0}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Usuários</div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Quick Actions */}
      <div className="glass-card animate-fade-in-up">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ 
            fontSize: '2rem',
            marginRight: '1rem'
          }}>
            ⚡
          </div>
          <h3 style={{ margin: 0, color: '#171a20' }}>Ações Rápidas</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/reports" className="btn btn-primary">
            📊 Visualizar Relatórios
          </Link>
          {(isAdmin() || isManager()) && (
            <Link to="/companies" className="btn btn-success">
              🏢 Gerenciar Empresas
            </Link>
          )}
          {isAdmin() && (
            <Link to="/admin/users" className="btn btn-warning">
              👥 Gerenciar Usuários
            </Link>
          )}
          <button 
            className="btn btn-info"
            onClick={() => window.location.reload()}
          >
            🔄 Atualizar Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;