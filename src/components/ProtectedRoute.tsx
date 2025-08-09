import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, checkAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyAuth = async () => {
      const isValid = await checkAuth();
      if (!isValid) {
        navigate('/login', { replace: true });
      }
    };

    if (!isAuthenticated) {
      verifyAuth();
    }
  }, [isAuthenticated, checkAuth, navigate]);

  if (!isAuthenticated) {
    return null; // Mostrar nada mientras se verifica la autenticación
  }

  return <>{children}</>;
};

export default ProtectedRoute;