import { Toaster } from '@/components/ui/sonner';
import { Toaster as ShadcnToaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import MasterDataManagement from './pages/MasterDataManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import ShiftSchedule from './pages/ShiftSchedule';
import ShiftGenerator from './pages/ShiftGenerator';
import VacationManagement from './pages/VacationManagement';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Profile from './pages/Profile';
import BusinessRuleManagement from './pages/BusinessRuleManagement';
import UnifiedRuleManagement from './pages/UnifiedRuleManagement';

import UserManagement from './pages/UserManagement';
import MobileShiftView from './pages/MobileShiftView';
import OvertimeRegistration from './pages/OvertimeRegistration';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ShadcnToaster />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* 一般ユーザー（権限レベル1）がアクセス可能 */}
            <Route path="/" element={<ProtectedRoute requiredRole={1}><Index /></ProtectedRoute>} />
            <Route path="/shift-schedule" element={<ProtectedRoute requiredRole={1}><ShiftSchedule /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute requiredRole={1}><Profile /></ProtectedRoute>} />
            <Route path="/mobile-shift-view" element={<ProtectedRoute requiredRole={1}><MobileShiftView /></ProtectedRoute>} />
            <Route path="/overtime-registration" element={<ProtectedRoute requiredRole={2}><OvertimeRegistration /></ProtectedRoute>} />
            
            {/* 営業所長以上（権限レベル2）がアクセス可能 */}
            <Route path="/shift-generator" element={<ProtectedRoute requiredRole={2}><ShiftGenerator /></ProtectedRoute>} />
            <Route path="/vacation-management" element={<ProtectedRoute requiredRole={2}><VacationManagement /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute requiredRole={2}><EmployeeManagement /></ProtectedRoute>} />
            <Route path="/business-rules" element={<ProtectedRoute requiredRole={2}><BusinessRuleManagement /></ProtectedRoute>} />
            <Route path="/unified-rules" element={<ProtectedRoute requiredRole={2}><UnifiedRuleManagement /></ProtectedRoute>} />

            <Route path="/master-data" element={<ProtectedRoute requiredRole={2}><MasterDataManagement /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute requiredRole={2}><Reports /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute requiredRole={2}><UserManagement /></ProtectedRoute>} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
