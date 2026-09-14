import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from 'zitejs/auth';
import { Toaster } from '@project/components/ui/sonner';
import Layout from './components/Layout';
import QuickActionsPage from './pages/QuickActionsPage';
import InventoryPage from './pages/InventoryPage';
import LowStockPage from './pages/LowStockPage';
import AuditPage from './pages/AuditPage';
import LogsPage from './pages/LogsPage';

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return null;

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<QuickActionsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/low-stock" element={<LowStockPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <Toaster />
    </BrowserRouter>
  );
}
