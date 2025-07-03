import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserRole } from '../hooks/useUserRole';

const AdminRoute = ({ children }) => {
  const { role, loading } = useUserRole();
  const location = useLocation();

  if (loading) {
    return <div>A verificar permissões...</div>;
  }

  if (role !== 'admin') {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default AdminRoute; 