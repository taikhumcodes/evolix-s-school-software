import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../core/auth/AuthContext';

interface PermissionRouteProps {
  permission: string;
}

export default function PermissionRoute({ permission }: PermissionRouteProps) {
  const { hasPermission, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
