// App.tsx - Updated
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './Index';
import NotFound from './NotFound';
import MasterDataManagement from './MasterDataManagement';
import EmployeeManagement from './EmployeeManagement';
import ShiftSchedule from './ShiftSchedule';

import ShiftGenerator from './ShiftGenerator';
import VacationManagement from './VacationManagement';
import Reports from './Reports';
import UserRegistration from './UserRegistration';
import Login from './Login';
import ProtectedRoute from '@/components/ProtectedRoute';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/master-data" element={<ProtectedRoute><MasterDataManagement /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute><EmployeeManagement /></ProtectedRoute>} />
            <Route path="/shift-schedule" element={<ProtectedRoute><ShiftSchedule /></ProtectedRoute>} />
            <Route path="/shift-generator" element={<ProtectedRoute><ShiftGenerator /></ProtectedRoute>} />

            <Route path="/vacation-management" element={<ProtectedRoute><VacationManagement /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/user-registration" element={<ProtectedRoute requiredRole={3}><UserRegistration /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;