import React, { useState, useEffect, useId } from 'react';
import { ExchangeRateService, ExchangeRate } from '../../lib/exchangeRateService';
// Importar los componentes UI necesarios
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { RefreshCw, Plus, CheckCircle, AlertCircle, Edit } from 'lucide-react';

interface ExchangeRateFormData {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: 'MANUAL' | 'BCV';
  rateDate: string; // Añadir campo para la fecha
}

export function ExchangeRateManagement() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [formData, setFormData] = useState<ExchangeRateFormData>({
    baseCurrency: 'VES',
    targetCurrency: 'USD',
    rate: 0,
    source: 'MANUAL',
    rateDate: new Date().toISOString().split('T')[0] // Añadir fecha actual por defecto
  });

  // Generar un ID único para los elementos del formulario
  const idPrefix = useId() || 'exchange-rate';

  const currencies = ['VES', 'USD', 'EUR', 'CNY', 'TRY', 'RUB'];

  useEffect(() => {
    loadRates();
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      setApiStatus('checking');
      const response = await fetch('https://bcv-api.rafnixg.dev/v1/exchange-rates/latest/USD');
      if (response.ok) {
        setApiStatus('online');
      } else {
        setApiStatus('offline');
      }
    } catch (error) {
      setApiStatus('offline');
    }
  };

  const loadRates = async () => {
    try {
      setLoading(true);
      const currentRates = await ExchangeRateService.getCurrentRates();
      
      // Log para depuración
      console.log('Tasas cargadas en componente:', currentRates);
      
      setRates(currentRates);
    } catch (error) {
      console.error('Error cargando tasas:', error);
      showMessage('error', 'Error al cargar las tasas de cambio');
    } finally {
      setLoading(false);
    }
  };

  const updateFromBCV = async () => {
    try {
      setUpdating(true);
      showMessage('success', 'Conectando con la API del BCV...');
      
      const result = await ExchangeRateService.updateAllRates();
      
      if (result.success) {
        showMessage('success', `✅ ${result.message}`);
        await loadRates();
        setApiStatus('online');
      } else {
        showMessage('error', `❌ ${result.message}`);
        setApiStatus('offline');
      }
    } catch (error) {
      console.error('Error actualizando desde BCV:', error);
      showMessage('error', '❌ Error de conexión con la API del BCV');
      setApiStatus('offline');
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRate) {
        // Actualizar tasa existente
        await ExchangeRateService.updateExchangeRate(editingRate.id!, {
          base_currency: formData.baseCurrency,
          target_currency: formData.targetCurrency,
          rate: formData.rate,
          rate_date: formData.rateDate,
          source: formData.source
        });
        showMessage('success', 'Tasa actualizada exitosamente');
      } else {
        // Crear nueva tasa
        await ExchangeRateService.createManualRate(
          formData.baseCurrency,
          formData.targetCurrency,
          formData.rate,
          formData.rateDate
        );
        showMessage('success', 'Tasa creada exitosamente');
      }
      
      await loadRates();
      resetForm();
    } catch (error) {
      console.error('Error guardando tasa:', error);
      showMessage('error', 'Error al guardar la tasa de cambio');
    }
  };

  const handleEdit = (rate: ExchangeRate) => {
    setEditingRate(rate);
    setFormData({
      baseCurrency: rate.base_currency,
      targetCurrency: rate.target_currency,
      rate: rate.rate,
      source: rate.source as 'MANUAL' | 'BCV',
      rateDate: rate.rate_date
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      baseCurrency: 'VES',
      targetCurrency: 'USD',
      rate: 0,
      source: 'MANUAL',
      rateDate: new Date().toISOString().split('T')[0]
    });
    setEditingRate(null);
    setShowForm(false);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Tasas de Cambio</h1>
          <p className="text-gray-600 mt-1">Administra las tasas de cambio del sistema</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-blue-600">🔗 API del BCV Venezuela:</span>
            {apiStatus === 'checking' && (
              <span className="text-sm text-yellow-600">🔄 Verificando...</span>
            )}
            {apiStatus === 'online' && (
              <span className="text-sm text-green-600">🟢 En línea</span>
            )}
            {apiStatus === 'offline' && (
              <span className="text-sm text-red-600">🔴 Sin conexión</span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={updateFromBCV}
            disabled={updating}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
            {updating ? 'Obteniendo tasas del BCV...' : '🔄 Actualizar desde BCV'}
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva Tasa
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      {showForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingRate ? 'Editar Tasa de Cambio' : 'Nueva Tasa de Cambio'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda Base
                </label>
                <select
                  value={formData.baseCurrency}
                  onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {currencies.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda Objetivo
                </label>
                <select
                  value={formData.targetCurrency}
                  onChange={(e) => setFormData({ ...formData, targetCurrency: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {currencies.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={formData.rateDate}
                onChange={(e) => setFormData({...formData, rateDate: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tasa de Cambio
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: 36.5000"
                required
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit">
                {editingRate ? 'Actualizar' : 'Crear'} Tasa
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Tasas de Cambio Actuales</h3>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Cargando tasas...</p>
            </div>
          ) : rates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No hay tasas de cambio disponibles</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Par de Monedas</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Tasa</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Fuente</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Fecha</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rates
                    .filter(rate => 
                      rate && 
                      typeof rate.id === 'string' && rate.id.trim() !== '' &&
                      typeof rate.base_currency === 'string' && rate.base_currency.trim() !== '' &&
                      typeof rate.target_currency === 'string' && rate.target_currency.trim() !== ''
                    )
                    .map((rate, index) => {
                      const key = rate.id || `${rate.base_currency}-${rate.target_currency}-${index}`;
                      return (
                        <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="font-medium">
                              {rate.base_currency}/{rate.target_currency}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {rate.rate.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              rate.source === 'BCV' 
                                ? 'bg-green-100 text-green-800'
                                : rate.source === 'ECB'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {rate.source}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-sm text-gray-600">
                            {formatDate(rate.rate_date)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(rate)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Editar
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}