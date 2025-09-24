import React from 'react';
import { clsx } from 'clsx';
import { 
  BarChart3, 
  FileText, 
  PieChart, 
  TrendingUp, 
  Database, 
  Settings,
  Building,
  Users,
  AlertTriangle,
  HardDrive
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const navigation = [
  { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
  { id: 'statements', name: 'Financial Statements', icon: FileText },
  { id: 'analysis', name: 'Ratio Analysis', icon: PieChart },
  { id: 'comparative', name: 'Comparative Analysis', icon: TrendingUp },
  { id: 'import', name: 'Data Import', icon: Database },
  { id: 'alerts', name: 'Risk Alerts', icon: AlertTriangle },
  { id: 'companies', name: 'Companies', icon: Building },
  { id: 'backup', name: 'Backup Manager', icon: HardDrive },
  { id: 'users', name: 'User Management', icon: Users },
  { id: 'settings', name: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  return (
    <div className="bg-gray-900 text-white w-64 min-h-screen">
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-100 mb-6">Navigation</h2>
        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={clsx(
                  'w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200',
                  activeView === item.id
                    ? 'bg-blue-700 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};