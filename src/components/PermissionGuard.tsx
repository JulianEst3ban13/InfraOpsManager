import React, { ReactNode } from 'react';
import { usePermissions } from '../context/PermissionContext';

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  permission, 
  children, 
  fallback = null 
}) => {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return <div>Cargando permisos...</div>;
  }

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface AnyPermissionGuardProps {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const AnyPermissionGuard: React.FC<AnyPermissionGuardProps> = ({ 
  permissions, 
  children, 
  fallback = null 
}) => {
  const { hasAnyPermission, isLoading } = usePermissions();

  if (isLoading) {
    return <div>Cargando permisos...</div>;
  }

  if (!hasAnyPermission(permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface AllPermissionsGuardProps {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const AllPermissionsGuard: React.FC<AllPermissionsGuardProps> = ({ 
  permissions, 
  children, 
  fallback = null 
}) => {
  const { hasAllPermissions, isLoading } = usePermissions();

  if (isLoading) {
    return <div>Cargando permisos...</div>;
  }

  if (!hasAllPermissions(permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}; 