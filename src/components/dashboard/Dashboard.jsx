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
        <div className="glass-card glass-card-profile" style={{ 
          background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #374151 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div className="card-icon" style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '2rem',
              fontWeight: 'bold',
              marginRight: '1.5rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}>
              {(user.profile?.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#ffffff',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>👤 Seu Perfil</h3>
              <div className="status-indicator" style={{ 
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                marginTop: '0.5rem',
                fontWeight: '600',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
                {getRoleDisplayName(user.role)}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.95rem', color: '#ffffff', lineHeight: '1.8' }}>
            <p style={{ marginBottom: '0.8rem', color: '#ffffff' }}><strong style={{ fontSize: '1.1rem' }}>📧</strong> <strong>Email:</strong> {user.email}</p>
            <p style={{ marginBottom: '0.8rem', color: '#ffffff' }}><strong style={{ fontSize: '1.1rem' }}>📅</strong> <strong>Membro desde:</strong> {new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
            {user.lastLogin && (
              <p style={{ marginBottom: '0.8rem', color: '#ffffff' }}><strong style={{ fontSize: '1.1rem' }}>🕒</strong> <strong>Último acesso:</strong> {new Date(user.lastLogin).toLocaleString('pt-BR')}</p>
            )}
          </div>
        </div>

        {/* Companies Card */}
        <div className="glass-card glass-card-companies" style={{ 
          background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 50%, #06d6a0 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div className="card-icon" style={{ 
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              marginRight: '1.5rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}>
              🏢
            </div>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#ffffff',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>Suas Empresas</h3>
              <div className="status-indicator" style={{ 
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                marginTop: '0.5rem',
                fontWeight: '600',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
                {user.companies?.length || 0} empresa{(user.companies?.length || 0) !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          {user.companies && user.companies.length > 0 ? (
            <div>
              {user.companies.slice(0, 3).map((company, index) => (
                <div key={company._id || company} style={{ 
                  padding: '0.8rem 1rem',
                  margin: '0.6rem 0',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  • {company.name || company}
                </div>
              ))}
              {user.companies.length > 3 && (
                <div style={{ 
                  fontSize: '0.9rem', 
                  color: '#ffffff', 
                  textAlign: 'center', 
                  marginTop: '1rem',
                  fontWeight: '500',
                  opacity: 0.9
                }}>
                  +{user.companies.length - 3} empresas adicionais
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              color: '#ffffff', 
              padding: '2rem',
              fontSize: '1rem',
              fontWeight: '500',
              opacity: 0.9
            }}>
              {isAdmin() ? '🌟 Acesso a todas as empresas' : '📋 Nenhuma empresa associada'}
            </div>
          )}
        </div>

        {/* Reports Card */}
        <div className="glass-card glass-card-reports" style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #5e60ce 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div className="card-icon" style={{ 
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              marginRight: '1.5rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}>
              📊
            </div>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#ffffff',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>Relatórios</h3>
              <div className="status-indicator" style={{ 
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                marginTop: '0.5rem',
                fontWeight: '600',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
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
                  alignItems: 'center',
                  padding: '0.8rem 1rem',
                  margin: '0.6rem 0',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  <span>{type._id}</span>
                  <span style={{ 
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    color: '#ffffff'
                  }}>{type.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              color: '#ffffff', 
              padding: '2rem',
              fontSize: '1rem',
              fontWeight: '500',
              opacity: 0.9
            }}>
              📈 Nenhum relatório encontrado
            </div>
          )}
        </div>

      </div>

      {/* Admin Stats */}
      {isAdmin() && (stats?.companies || stats?.users) && (
        <div className="grid-2 animate-fade-in-up" style={{ marginBottom: '2rem' }}>
          
          {stats?.companies && (
            <div className="glass-card glass-card-stats-companies" style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div className="card-icon" style={{ 
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.2rem',
                  marginRight: '1.5rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                }}>
                  🏭
                </div>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    color: '#ffffff',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>Estatísticas de Empresas</h3>
                  <div className="status-indicator" style={{ 
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    marginTop: '0.5rem',
                    fontWeight: '600',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    Visão Administrativa
                  </div>
                </div>
              </div>
              <div className="grid-3" style={{ gap: '1rem' }}>
                <div style={{ 
                  textAlign: 'center', 
                  padding: '1.5rem 1rem', 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  <div className="stat-number" style={{ fontSize: '3rem', fontWeight: '900', color: '#ffffff', textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)' }}>
                    {stats.companies.overview.total}
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: '600', marginTop: '0.5rem' }}>Total</div>
                </div>
                <div style={{ 
                  textAlign: 'center', 
                  padding: '1.5rem 1rem', 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  <div className="stat-number" style={{ fontSize: '3rem', fontWeight: '900', color: '#ffffff', textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)' }}>
                    {stats.companies.overview.active}
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: '600', marginTop: '0.5rem' }}>Ativas</div>
                </div>
                <div style={{ 
                  textAlign: 'center', 
                  padding: '1.5rem 1rem', 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  <div className="stat-number" style={{ fontSize: '3rem', fontWeight: '900', color: '#ffffff', textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)' }}>
                    {stats.companies.overview.inactive}
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: '600', marginTop: '0.5rem' }}>Inativas</div>
                </div>
              </div>
            </div>
          )}

          {stats?.users && (
            <div className="glass-card glass-card-stats-users" style={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div className="card-icon" style={{ 
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.2rem',
                  marginRight: '1.5rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                }}>
                  👥
                </div>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    color: '#ffffff',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>Estatísticas de Usuários</h3>
                  <div className="status-indicator" style={{ 
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    marginTop: '0.5rem',
                    fontWeight: '600',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    Painel Administrativo
                  </div>
                </div>
              </div>
              <div className="grid-4" style={{ gap: '1rem' }}>
                <div style={{ 
                  textAlign: 'center', 
                  padding: '1.5rem 1rem', 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  <div className="stat-number" style={{ fontSize: '3rem', fontWeight: '900', color: '#ffffff', textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)' }}>
                    {stats.users.overview.total}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600', marginTop: '0.5rem' }}>Total</div>
                </div>
                <div style={{ 
                  textAlign: 'center', 
                  padding: '1.5rem 1rem', 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  <div className="stat-number" style={{ fontSize: '3rem', fontWeight: '900', color: '#ffffff', textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)' }}>
                    {stats.users.overview.active}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600', marginTop: '0.5rem' }}>Ativos</div>
                </div>
                <div style={{ 
                  textAlign: 'center', 
                  padding: '1.5rem 1rem', 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  <div className="stat-number" style={{ fontSize: '2rem', fontWeight: '900', color: '#ffffff', textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)' }}>
                    {stats.users.overview.admins || 0}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600', marginTop: '0.5rem' }}>Admins</div>
                </div>
                <div style={{ 
                  textAlign: 'center', 
                  padding: '1.5rem 1rem', 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  <div className="stat-number" style={{ fontSize: '2rem', fontWeight: '900', color: '#ffffff', textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)' }}>
                    {stats.users.overview.users || 0}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '600', marginTop: '0.5rem' }}>Usuários</div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Quick Actions */}
      <div className="glass-card animate-fade-in-up" style={{ 
        background: 'linear-gradient(135deg, rgba(62, 106, 225, 0.03), rgba(138, 85, 255, 0.03))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3e6ae1 0%, #8a55ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            marginRight: '1.5rem',
            boxShadow: '0 8px 24px rgba(62, 106, 225, 0.3)'
          }}>
            ⚡
          </div>
          <h3 style={{ 
            margin: 0, 
            fontSize: '1.6rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #171a20 0%, #3e6ae1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>Ações Rápidas</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/reports" className="btn btn-primary btn-shimmer" style={{ fontSize: '1.05rem', padding: '1rem 2rem' }}>
            <span style={{ fontSize: '1.3rem', marginRight: '0.5rem' }}>📊</span> Visualizar Relatórios
          </Link>
          {(isAdmin() || isManager()) && (
            <Link to="/companies" className="btn btn-success btn-shimmer" style={{ fontSize: '1.05rem', padding: '1rem 2rem' }}>
              <span style={{ fontSize: '1.3rem', marginRight: '0.5rem' }}>🏢</span> Gerenciar Empresas
            </Link>
          )}
          {isAdmin() && (
            <Link to="/admin/users" className="btn btn-warning btn-shimmer" style={{ fontSize: '1.05rem', padding: '1rem 2rem' }}>
              <span style={{ fontSize: '1.3rem', marginRight: '0.5rem' }}>👥</span> Gerenciar Usuários
            </Link>
          )}
          <button 
            className="btn btn-info btn-shimmer"
            onClick={() => window.location.reload()}
            style={{ fontSize: '1.05rem', padding: '1rem 2rem' }}
          >
            <span style={{ fontSize: '1.3rem', marginRight: '0.5rem' }}>🔄</span> Atualizar Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;