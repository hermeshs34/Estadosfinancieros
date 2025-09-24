import React from 'react';
import { FileText, Upload, TrendingUp, TrendingDown } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { formatPercentage, formatPercentageValue, formatRatio } from '../../lib/numberFormatting';

export const RatiosOverview: React.FC = () => {
  const { financialAnalysis } = useDataContext();

  if (!financialAnalysis) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay datos financieros disponibles
          </h3>
          <p className="text-gray-600 mb-6 max-w-md">
            Para ver los ratios financieros, primero debe importar datos desde la sección "Data Import".
          </p>
          <div className="flex items-center justify-center text-sm text-gray-500">
            <Upload className="w-4 h-4 mr-2" />
            <span>Importe archivos CSV, Excel o PDF para comenzar</span>
          </div>
        </div>
      </div>
    );
  }

  const { ratios } = financialAnalysis;
  
  // Funciones de formateo importadas desde numberFormatting.ts

  const getRatioColor = (value: number, type: 'liquidez' | 'rentabilidad') => {
    if (type === 'liquidez') {
      return value >= 1.5 ? 'text-green-600' : value >= 1 ? 'text-yellow-600' : 'text-red-600';
    } else {
      return value >= 10 ? 'text-green-600' : value >= 5 ? 'text-yellow-600' : 'text-red-600';
    }
  };

  const getRatioIcon = (value: number, threshold: number) => {
    return value >= threshold ? 
      <TrendingUp className="w-4 h-4 text-green-600" /> : 
      <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {/* Ratio Corriente */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            {getRatioIcon(ratios.liquidez.corriente, 1.5)}
            <span className="ml-2 text-sm font-medium text-gray-700">Ratio Corriente</span>
          </div>
          <span className={`font-semibold ${getRatioColor(ratios.liquidez.corriente, 'liquidez')}`}>
            {formatRatio(ratios.liquidez.corriente)}
          </span>
        </div>

        {/* ROE */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            {getRatioIcon(ratios.rentabilidad.roe, 10)}
            <span className="ml-2 text-sm font-medium text-gray-700">ROE</span>
          </div>
          <span className={`font-semibold ${getRatioColor(ratios.rentabilidad.roe, 'rentabilidad')}`}>
            {formatPercentageValue(ratios.rentabilidad.roe)}
          </span>
        </div>

        {/* Margen Neto */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            {getRatioIcon(ratios.rentabilidad.margenNeto, 5)}
            <span className="ml-2 text-sm font-medium text-gray-700">Margen Neto</span>
          </div>
          <span className={`font-semibold ${getRatioColor(ratios.rentabilidad.margenNeto, 'rentabilidad')}`}>
            {formatPercentageValue(ratios.rentabilidad.margenNeto)}
          </span>
        </div>

        {/* Endeudamiento Total */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            {getRatioIcon(50 - ratios.endeudamiento.total, 0)}
            <span className="ml-2 text-sm font-medium text-gray-700">Endeudamiento</span>
          </div>
          <span className={`font-semibold ${ratios.endeudamiento.total <= 50 ? 'text-green-600' : ratios.endeudamiento.total <= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
            {formatPercentageValue(ratios.endeudamiento.total)}
          </span>
        </div>

        {/* Insurance-specific ratios */}
        {ratios.seguros && (
          <>
            <div className="mt-4 mb-2">
              <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-1">
                Ratios de Seguros
              </h4>
            </div>
            
            {/* Solvencia */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                {getRatioIcon(ratios.seguros.solvencia, 150)}
                <span className="ml-2 text-sm font-medium text-gray-700">Solvencia</span>
              </div>
              <span className={`font-semibold ${
                ratios.seguros.solvencia >= 200 ? 'text-green-600' : 
                ratios.seguros.solvencia >= 150 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {formatPercentageValue(ratios.seguros.solvencia)}
              </span>
            </div>

            {/* Cobertura Técnica */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                {getRatioIcon(ratios.seguros.coberturaTecnica, 100)}
                <span className="ml-2 text-sm font-medium text-gray-700">Cobertura Técnica</span>
              </div>
              <span className={`font-semibold ${
                ratios.seguros.coberturaTecnica >= 120 ? 'text-green-600' : 
                ratios.seguros.coberturaTecnica >= 100 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {formatPercentageValue(ratios.seguros.coberturaTecnica)}
              </span>
            </div>

            {/* Ratio de Reservas */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                {getRatioIcon(ratios.seguros.ratioReservas, 80)}
                <span className="ml-2 text-sm font-medium text-gray-700">Ratio de Reservas</span>
              </div>
              <span className={`font-semibold ${
                ratios.seguros.ratioReservas >= 90 ? 'text-green-600' : 
                ratios.seguros.ratioReservas >= 80 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {formatPercentageValue(ratios.seguros.ratioReservas)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};