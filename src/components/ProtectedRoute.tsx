import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '@/utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    // ログインしていない場合はログインページにリダイレクト
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

