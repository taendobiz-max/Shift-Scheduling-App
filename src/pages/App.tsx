import { Toaster } from '@/components/ui/sonner';
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
import ProtectedRoute from './components/ProtectedRoute';

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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;