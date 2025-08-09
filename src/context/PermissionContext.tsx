import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import axiosInstance from '../utils/axios';
import { useAuth } from './AuthContext';

interface Permission {
  id: number;
  name: string;
  description: string;
  state: 'active' | 'inactive';
  created_at: string;
}

interface PermissionContextType {
  permissions: Permission[];
  isLoading: boolean;
  hasPermission: (permissionName: string) => boolean;
  hasAnyPermission: (permissionNames: string[]) => boolean;
  hasAllPermissions: (permissionNames: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPermissions = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/me/permissions');
      setPermissions(response.data);
    } catch (error) {
      console.error('Error cargando permisos:', error);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permissionName: string): boolean => {
    return permissions.some(p => p.name === permissionName && p.state === 'active');
  };

  const hasAnyPermission = (permissionNames: string[]): boolean => {
    return permissionNames.some(name => hasPermission(name));
  };

  const hasAllPermissions = (permissionNames: string[]): boolean => {
    return permissionNames.every(name => hasPermission(name));
  };

  const refreshPermissions = async () => {
    if (isAuthenticated) {
      await loadPermissions();
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPermissions();
    } else {
      setPermissions([]); // Limpiar permisos si el usuario no está autenticado
    }
  }, [isAuthenticated]);

  const value = {
    permissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}; 