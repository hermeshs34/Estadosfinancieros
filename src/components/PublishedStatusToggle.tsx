import React from 'react';
import { useDataContext } from '../contexts/DataContext';
import { FinancialPeriod } from '../types';

interface PublishedStatusToggleProps {
  period: FinancialPeriod;
  onStatusChange?: () => void;
}

export const PublishedStatusToggle: React.FC<PublishedStatusToggleProps> = ({ 
  period, 
  onStatusChange 
}) => {
  const { togglePeriodPublishedStatus } = useDataContext();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleToggle = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await togglePeriodPublishedStatus(period.id, !period.is_published);
      onStatusChange?.();
    } catch (error) {
      console.error('Error al cambiar estado de publicación:', error);
      alert('Error al cambiar el estado de publicación del período');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          px-3 py-1 rounded-full text-xs font-medium transition-colors
          ${period.is_published 
            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isLoading ? (
          'Cambiando...'
        ) : (
          period.is_published ? '📋 Publicado' : '📝 Borrador'
        )}
      </button>
      
      {period.is_published && (
        <span className="text-xs text-green-600 font-medium">
          🔒 Protegido contra eliminación
        </span>
      )}
    </div>
  );
};