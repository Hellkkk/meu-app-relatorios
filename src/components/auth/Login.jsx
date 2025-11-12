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
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
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
        maxWidth: isDesktop ? '480px' : '440px',
        margin: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        padding: isDesktop ? '2rem' : '1.5rem',
        borderRadius: isDesktop ? '20px' : '16px',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.15)',
        position: 'relative',
        zIndex: 2
      }}>
        
        {/* Logo/Header */}
        <div style={{ textAlign: 'center', marginBottom: isDesktop ? '2rem' : '1.5rem' }}>
          <div style={{
            width: isDesktop ? '72px' : '64px',
            height: isDesktop ? '72px' : '64px',
            background: 'linear-gradient(135deg, #3867d6 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            color: 'white',
            fontSize: isDesktop ? '2rem' : '1.75rem',
            fontWeight: 'bold',
            boxShadow: '0 12px 35px rgba(56, 103, 214, 0.4)'
          }}>
            📊
          </div>
          <h1 style={{ 
            margin: 0,
            fontSize: isDesktop ? '2rem' : '1.7rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #171a20 0%, #3867d6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            App Relatórios
          </h1>
          <p style={{ 
            margin: '0.75rem 0 0 0',
            color: '#6c757d',
            fontSize: isDesktop ? '1.0rem' : '0.95rem',
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
                height: isDesktop ? '48px' : '44px',
                fontSize: isDesktop ? '0.95rem' : '0.9rem',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '2px solid rgba(56, 103, 214, 0.2)',
                transition: 'all 0.3s ease',
                borderRadius: isDesktop ? '12px' : '10px',
                padding: isDesktop ? '0.75rem 1rem' : '0.65rem 0.9rem'
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
                height: isDesktop ? '48px' : '44px',
                fontSize: isDesktop ? '0.95rem' : '0.9rem',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '2px solid rgba(56, 103, 214, 0.2)',
                transition: 'all 0.3s ease',
                borderRadius: isDesktop ? '12px' : '10px',
                padding: isDesktop ? '0.75rem 1rem' : '0.65rem 0.9rem'
              }}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-hero"
            style={{ 
              width: '100%', 
              marginTop: '1rem',
              height: isDesktop ? '48px' : '44px',
              fontSize: isDesktop ? '1rem' : '0.95rem',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: isDesktop ? '12px' : '10px',
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