import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/layout/Navbar';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import CompaniesClean from './components/companies/CompaniesClean';
import Reports from './components/reports/Reports';
import AdminUsersClean from './components/admin/AdminUsersClean';
import UserCompanyLinks from './components/admin/UserCompanyLinks';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import ManagerRoute from './components/auth/ManagerRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="container">
            <Routes>
              <Route path="/login" element={<Login />} />
              
              {/* Rotas protegidas */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/companies" element={
                <ManagerRoute>
                  <CompaniesClean />
                </ManagerRoute>
              } />
              
              <Route path="/reports" element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              } />
              
              <Route path="/admin/users" element={
                <AdminRoute>
                  <AdminUsersClean />
                </AdminRoute>
              } />
              
              <Route path="/admin/user-company-links" element={
                <AdminRoute>
                  <UserCompanyLinks />
                </AdminRoute>
              } />
              
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;