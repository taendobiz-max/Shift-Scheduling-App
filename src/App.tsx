import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import MasterDataManagement from './pages/MasterDataManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import ShiftSchedule from './pages/ShiftSchedule';
import SkillMatrixManagement from './pages/SkillMatrixManagement';
import ShiftGenerator from './pages/ShiftGenerator';
import VacationManagement from './pages/VacationManagement';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/master-data" element={<MasterDataManagement />} />
            <Route path="/employees" element={<EmployeeManagement />} />
            <Route path="/shift-schedule" element={<ShiftSchedule />} />
            <Route path="/shift-generator" element={<ShiftGenerator />} />
            <Route path="/skill-matrix" element={<SkillMatrixManagement />} />
            <Route path="/vacation-management" element={<VacationManagement />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;