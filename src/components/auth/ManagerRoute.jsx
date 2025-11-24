import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * ManagerRoute - Protected route component for Admin and Manager roles
 * 
 * This route allows access to both admins and managers, ensuring that
 * managers can access company and report management features while
 * maintaining separation from admin-only functionality.
 * 
 * Usage: Wrap any route that should be accessible to managers and admins
 */
const ManagerRoute = ({ children }) => {
  const { isAuthenticated, isAdminOrManager, loading } = useAuth();

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminOrManager()) {
    return (
      <div className="card">
        <h2>Acesso Negado</h2>
        <p>Você não tem permissão para acessar esta página. Apenas administradores e gerentes podem acessar esta área.</p>
      </div>
    );
  }

  return children;
};

export default ManagerRoute;