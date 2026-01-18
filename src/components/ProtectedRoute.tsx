import { Navigate } from 'react-router-dom';
import { isAuthenticated, hasPermission } from '@/utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: number; // 必要な権限レベル（デフォルト: 1 = 一般ユーザー）
}

export default function ProtectedRoute({ children, requiredRole = 1 }: ProtectedRouteProps) {
  // ログインチェック
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // 権限チェック
  if (!hasPermission(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">アクセス権限がありません</h2>
          <p className="text-gray-700 mb-4">
            この画面を表示する権限がありません。
          </p>
          <p className="text-gray-600 text-sm">
            必要な権限レベル: {requiredRole === 3 ? '管理者' : requiredRole === 2 ? '営業所長' : '一般ユーザー'}
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
