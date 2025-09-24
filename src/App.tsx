import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import { DataProvider, useDataContext } from './contexts/DataContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { LoginForm } from './components/auth/LoginForm';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import { FinancialStatements } from './components/statements/FinancialStatements';
import { RatioAnalysis } from './components/analysis/RatioAnalysis';
import { ComparativeAnalysis } from './components/analysis/ComparativeAnalysis';
import DataImport from './components/data/DataImport';
import { CompanyManagement } from './components/companies/CompanyManagement';
import RiskAlertsManager from './components/analysis/RiskAlertsManager';
import { ExchangeRateManagement } from './components/settings/ExchangeRateManagement';
import UserManagement from './components/users/UserManagement';
import BackupManager from './components/backup/BackupManager';
import ToastContainer from './components/ui/ToastContainer';
import useToast from './hooks/useToast';
import './index.css';

const queryClient = new QueryClient();

function AppContent() {
  const { user } = useAuth();
  const { toasts, removeToast } = useToast();
  const [activeView, setActiveView] = useState('dashboard');

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard />;
      case 'statements': return <FinancialStatements />;
      case 'analysis': return <RatioAnalysis />;
      case 'comparative': return <ComparativeAnalysis />;
      case 'import': return <DataImport />;
      case 'companies': return <CompanyManagement />;
      case 'alerts': return <RiskAlertsManager />;
      case 'backup': return <BackupManager />;
      case 'users': return <UserManagement />;
      case 'settings':
        return <ExchangeRateManagement />;
      default: return <Dashboard />;
    }
  };

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        <main className="flex-1 p-6">
          {renderView()}
        </main>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DataProvider>
          <CurrencyProvider>
            <AppContent />
          </CurrencyProvider>
        </DataProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;