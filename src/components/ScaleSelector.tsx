import React from 'react';
import { Scale, Settings } from 'lucide-react';

export type DisplayScale = 'real' | 'thousands' | 'millions' | 'billions';

export interface ScaleSelectorProps {
  currentScale: DisplayScale;
  onScaleChange: (scale: DisplayScale) => void;
  className?: string;
}

export const scaleFactors: Record<DisplayScale, number> = {
  real: 1,
  thousands: 1_000,
  millions: 1_000_000,
  billions: 1_000_000_000
};

export const scaleLabels: Record<DisplayScale, string> = {
  real: 'Valores Reales',
  thousands: 'Miles',
  millions: 'Millones',
  billions: 'Miles de Millones'
};

export const scaleSuffixes: Record<DisplayScale, string> = {
  real: '',
  thousands: 'K',
  millions: 'M',
  billions: 'B'
};

const ScaleSelector: React.FC<ScaleSelectorProps> = ({
  currentScale,
  onScaleChange,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Scale className="w-4 h-4 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">Escala:</span>
      <select
        value={currentScale}
        onChange={(e) => onScaleChange(e.target.value as DisplayScale)}
        className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      >
        {Object.entries(scaleLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      
      {/* Tooltip explicativo */}
      <div className="relative group">
        <Settings className="w-4 h-4 text-gray-400 cursor-help" />
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          <div className="text-center">
            <div className="font-semibold">Escala de Visualización</div>
            <div className="mt-1">
              Ajusta cómo se muestran los valores financieros
            </div>
            <div className="mt-1 text-gray-300">
              Útil para manejar cifras muy grandes
            </div>
          </div>
          {/* Flecha del tooltip */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      </div>
    </div>
  );
};

export default ScaleSelector;