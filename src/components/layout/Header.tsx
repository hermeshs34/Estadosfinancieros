import React from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useDataContext } from '../../contexts/DataContext';
import { Button } from '../ui/Button';
import { Calculator, LogOut, User } from 'lucide-react';
import { CompanySelector } from '../ui/CompanySelector';
import { PeriodSelector } from '../ui/PeriodSelector';

export const Header: React.FC = () => {
  const { signOut, user } = useAuth();
  const { selectedCompany, switchCompany } = useDataContext();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calculator className="w-8 h-8 text-blue-700" />
              <h1 className="text-2xl font-bold text-gray-900">FinAnalytics Pro</h1>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
              Enterprise Edition
            </span>
          </div>
          
          {/* Context Selectors */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg border">
              <CompanySelector 
                currentCompany={selectedCompany}
                onCompanyChange={switchCompany}
                className="min-w-[200px]" 
              />
              <div className="w-px h-6 bg-gray-300"></div>
              <PeriodSelector className="min-w-[180px]" />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{user?.email}</span>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};