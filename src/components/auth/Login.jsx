import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (!result.success) {
        setError(result.message);
      }
    } catch (error) {
      setError('Erro interno do servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-fullscreen-wrapper" style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      overflow: 'auto',
      padding: isDesktop ? '2rem' : '1rem'
    }}>
      {/* Background Elements */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        animation: 'drift 20s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 1
      }} />
      
      <div className="glass-card animate-fade-in-up" style={{ 
        width: '100%', 
        maxWidth: isDesktop ? '600px' : '450px',
        margin: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        padding: isDesktop ? '4rem' : '2rem',
        borderRadius: isDesktop ? '32px' : '16px',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.15)',
        position: 'relative',
        zIndex: 2
      }}>
        
        {/* Logo/Header */}
        <div style={{ textAlign: 'center', marginBottom: isDesktop ? '3rem' : '2rem' }}>
          <div style={{
            width: isDesktop ? '120px' : '80px',
            height: isDesktop ? '120px' : '80px',
            background: 'linear-gradient(135deg, #3867d6 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            color: 'white',
            fontSize: isDesktop ? '3rem' : '2rem',
            fontWeight: 'bold',
            boxShadow: '0 12px 35px rgba(56, 103, 214, 0.4)'
          }}>
            📊
          </div>
          <h1 style={{ 
            margin: 0,
            fontSize: isDesktop ? '3rem' : '2rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #171a20 0%, #3867d6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            App Relatórios
          </h1>
          <p style={{ 
            margin: '1rem 0 0 0',
            color: '#6c757d',
            fontSize: isDesktop ? '1.3rem' : '1rem',
            fontWeight: '400'
          }}>
            Faça login para continuar
          </p>
        </div>
        
        {error && (
          <div className="alert alert-error animate-fade-in-down" style={{
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: '12px'
          }}>
            ⚠️ {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="form-group">
            <label htmlFor="email" className="form-label" style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500'
            }}>
              📧 Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-control"
              placeholder="seu@email.com"
              required
              disabled={loading}
              style={{
                height: isDesktop ? '64px' : '50px',
                fontSize: isDesktop ? '1.2rem' : '1rem',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '2px solid rgba(56, 103, 214, 0.2)',
                transition: 'all 0.3s ease',
                borderRadius: isDesktop ? '16px' : '8px',
                padding: isDesktop ? '1rem 1.5rem' : '0.75rem 1rem'
              }}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label" style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500'
            }}>
              🔒 Senha
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-control"
              placeholder="••••••••"
              required
              disabled={loading}
              style={{
                height: isDesktop ? '64px' : '50px',
                fontSize: isDesktop ? '1.2rem' : '1rem',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '2px solid rgba(56, 103, 214, 0.2)',
                transition: 'all 0.3s ease',
                borderRadius: isDesktop ? '16px' : '8px',
                padding: isDesktop ? '1rem 1.5rem' : '0.75rem 1rem'
              }}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-hero"
            style={{ 
              width: '100%', 
              marginTop: isDesktop ? '2rem' : '1.5rem',
              height: isDesktop ? '64px' : '50px',
              fontSize: isDesktop ? '1.3rem' : '1.1rem',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: isDesktop ? '16px' : '8px',
              fontWeight: '600'
            }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <div className="loading-spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white' }}></div>
                Entrando...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                🚀 Entrar
              </span>
            )}
          </button>
        </form>
        
        {/* Demo Accounts */}
        <div style={{ 
          marginTop: isDesktop ? '3rem' : '2rem', 
          padding: isDesktop ? '2.5rem' : '1.5rem', 
          background: 'linear-gradient(135deg, rgba(56, 103, 214, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          borderRadius: isDesktop ? '20px' : '12px',
          fontSize: isDesktop ? '1.1rem' : '0.9rem',
          border: '1px solid rgba(56, 103, 214, 0.2)'
        }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            fontWeight: '600',
            color: '#3867d6'
          }}>
            🎭 Contas de Demonstração
          </div>
          
          <div style={{ display: 'grid', gap: isDesktop ? '1.2rem' : '0.8rem' }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              padding: isDesktop ? '1.2rem' : '0.8rem',
              background: 'rgba(220, 53, 69, 0.1)',
              borderRadius: isDesktop ? '12px' : '8px',
              border: '1px solid rgba(220, 53, 69, 0.2)'
            }}>
              <span><strong>👑 Admin:</strong></span>
              <span style={{ fontFamily: 'monospace', fontSize: isDesktop ? '1rem' : '0.8rem' }}>admin@teste.com / admin123</span>
            </div>
            
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              padding: isDesktop ? '1.2rem' : '0.8rem',
              background: 'rgba(253, 126, 20, 0.1)',
              borderRadius: isDesktop ? '12px' : '8px',
              border: '1px solid rgba(253, 126, 20, 0.2)'
            }}>
              <span><strong>🏢 Gerente:</strong></span>
              <span style={{ fontFamily: 'monospace', fontSize: isDesktop ? '1rem' : '0.8rem' }}>manager@teste.com / manager123</span>
            </div>
            
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              padding: isDesktop ? '1.2rem' : '0.8rem',
              background: 'rgba(56, 103, 214, 0.1)',
              borderRadius: isDesktop ? '12px' : '8px',
              border: '1px solid rgba(56, 103, 214, 0.2)'
            }}>
              <span><strong>👤 Usuário:</strong></span>
              <span style={{ fontFamily: 'monospace', fontSize: isDesktop ? '1rem' : '0.8rem' }}>user@teste.com / user123</span>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '2rem',
          padding: '1rem 0',
          borderTop: '1px solid rgba(0, 0, 0, 0.1)',
          color: '#6c757d',
          fontSize: '0.9rem'
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            🔐 Sistema seguro com JWT
          </div>
          <div>
            💼 Gestão inteligente de relatórios
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drift {
          0%, 100% {
            transform: translateX(0) translateY(0) rotate(0deg);
          }
          25% {
            transform: translateX(10px) translateY(-10px) rotate(1deg);
          }
          50% {
            transform: translateX(-5px) translateY(5px) rotate(-1deg);
          }
          75% {
            transform: translateX(-10px) translateY(-5px) rotate(0.5deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Login;