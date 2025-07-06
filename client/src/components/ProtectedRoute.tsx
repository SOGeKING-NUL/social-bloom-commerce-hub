
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'user' | 'vendor' | 'admin';
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requiredRole,
  redirectTo = '/auth',
}) => {
  const { user, profile, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        setLocation(redirectTo);
        return;
      }

      if (requiredRole && profile?.role !== requiredRole) {
        setLocation('/');
        return;
      }
    }
  }, [user, profile, loading, requireAuth, requiredRole, setLocation, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (requireAuth && !user) {
    return null;
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
};
