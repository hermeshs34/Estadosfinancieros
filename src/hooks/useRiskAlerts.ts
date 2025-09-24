import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RiskAlert, AlertConfiguration } from '../types/alerts';
import { useDataContext } from '../contexts/DataContext';

export const useRiskAlerts = () => {
  const { selectedCompany, selectedPeriod } = useDataContext();
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar alertas desde Supabase
  const loadAlerts = async () => {
    if (!selectedCompany || !selectedPeriod) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('financial_alerts')
        .select('*')
        .eq('company_id', selectedCompany)
        .eq('period_id', selectedPeriod)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      setAlerts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar alertas');
      console.error('Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Guardar alerta en Supabase
  const saveAlert = async (alert: Omit<RiskAlert, 'id'>) => {
    if (!selectedCompany || !selectedPeriod) return;

    try {
      const { data, error } = await supabase
        .from('financial_alerts')
        .insert({
          ...alert,
          company_id: selectedCompany,
          period_id: selectedPeriod,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setAlerts(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar alerta');
      console.error('Error saving alert:', err);
      throw err;
    }
  };

  // Actualizar estado de alerta
  const updateAlertStatus = async (alertId: string, status: RiskAlert['status']) => {
    try {
      const { error } = await supabase
        .from('financial_alerts')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, status } : alert
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar alerta');
      console.error('Error updating alert:', err);
      throw err;
    }
  };

  // Eliminar alertas antiguas
  const cleanupOldAlerts = async (retentionDays: number = 30) => {
    if (!selectedCompany || !selectedPeriod) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { error } = await supabase
        .from('financial_alerts')
        .delete()
        .eq('company_id', selectedCompany)
        .eq('period_id', selectedPeriod)
        .lt('timestamp', cutoffDate.toISOString());

      if (error) throw error;

      // Recargar alertas después de la limpieza
      await loadAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al limpiar alertas');
      console.error('Error cleaning up alerts:', err);
    }
  };

  // Cargar alertas cuando cambie la empresa o período
  useEffect(() => {
    loadAlerts();
  }, [selectedCompany, selectedPeriod]);

  return {
    alerts,
    loading,
    error,
    loadAlerts,
    saveAlert,
    updateAlertStatus,
    cleanupOldAlerts
  };
};