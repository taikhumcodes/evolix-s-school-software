import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../core/auth/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const token = localStorage.getItem('access_token');

  // If there's no token, we can safely redirect immediately.
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If the query is still checking the token's validity against `/auth/me`, show loading.
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-mehndi-200"></div>
          <div className="text-sm font-medium text-zinc-500">Authenticating...</div>
        </div>
      </div>
    );
  }

  // If the token is invalid and we finished loading, redirect.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
