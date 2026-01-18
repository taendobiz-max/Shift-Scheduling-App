import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NavigationProps {
  showBackButton?: boolean;
  showHomeButton?: boolean;
  backPath?: string;
  className?: string;
}

export function Navigation({ 
  showBackButton = true, 
  showHomeButton = true, 
  backPath, 
  className = "mb-6" 
}: NavigationProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  const handleHome = () => {
    navigate('/');
  };

  if (!showBackButton && !showHomeButton) {
    return null;
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {showBackButton && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </Button>
      )}
      {showHomeButton && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleHome}
          className="flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          トップページ
        </Button>
      )}
    </div>
  );
}