import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Bell, Settings, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { RiskAlert, AlertThresholds, AlertConfiguration } from '../../types/alerts';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import NotificationSystem from '../notifications/NotificationSystem';

const defaultThresholds: AlertThresholds = {
  liquidez: {
    corriente: { critical: 1.0, warning: 1.5 },
    rapida: { critical: 0.8, warning: 1.2 }
  },
  solvencia: {
    endeudamiento: { critical: 0.8, warning: 0.6 },
    cobertura: { critical: 1.5, warning: 2.0 }
  },
  rentabilidad: {
    margenNeto: { critical: 0.02, warning: 0.05 },
    roa: { critical: 0.03, warning: 0.06 },
    roe: { critical: 0.05, warning: 0.10 }
  },
  operacional: {
    rotacionInventario: { critical: 2, warning: 4 },
    rotacionCuentasPorCobrar: { critical: 4, warning: 6 }
  }
};

const defaultConfig: AlertConfiguration = {
  enabled: true,
  thresholds: defaultThresholds,
  notifications: {
    email: false,
    dashboard: true,
    sound: false
  },
  autoResolve: false,
  retentionDays: 30
};

const RiskAlertsManager: React.FC = () => {
  const { importedData } = useDataContext();
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [config, setConfig] = useState<AlertConfiguration>(defaultConfig);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showConfig, setShowConfig] = useState(false);
  const [alertHistory, setAlertHistory] = useState<RiskAlert[]>([]);

  const calculateRatios = useMemo(() => {
    if (!importedData || !Array.isArray(importedData) || importedData.length === 0) {
      console.warn('RiskAlertsManager: No hay datos importados disponibles');
      return null;
    }

    try {
      const getInventoryValue = (): number => {
        return importedData
          .filter(item => item.account_code?.startsWith('1') && 
                         (item.account_name?.toLowerCase().includes('inventario') ||
                          item.account_name?.toLowerCase().includes('mercancia')))
          .reduce((sum, item) => sum + (item.debit || 0) - (item.credit || 0), 0);
      };

      const currentAssets = importedData
        .filter(item => item.account_code?.startsWith('1'))
        .reduce((sum, item) => sum + (item.debit || 0) - (item.credit || 0), 0);

      const currentLiabilities = importedData
        .filter(item => item.account_code?.startsWith('2'))
        .reduce((sum, item) => sum + (item.credit || 0) - (item.debit || 0), 0);

      const totalAssets = currentAssets;
      const totalLiabilities = currentLiabilities;
      const inventory = getInventoryValue();

      const accountsReceivable = importedData
        .filter(item => item.account_code?.startsWith('1'))
        .reduce((sum, item) => sum + (item.debit || 0) - (item.credit || 0), 0);

      const totalEquity = importedData
        .filter(item => item.account_code?.startsWith('3'))
        .reduce((sum, item) => sum + (item.credit || 0) - (item.debit || 0), 0);

      const revenue = 1000000;
      const netIncome = 50000;
      const costOfGoodsSold = 600000;
      const equity = totalEquity > 0 ? totalEquity : 1;

      const ratios = {
        liquidez: {
          corriente: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
          rapida: currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0
        },
        solvencia: {
          endeudamiento: totalAssets > 0 ? totalLiabilities / totalAssets : 0,
          cobertura: totalLiabilities > 0 ? totalAssets / totalLiabilities : 0
        },
        rentabilidad: {
          margenNeto: revenue > 0 ? netIncome / revenue : 0,
          roa: totalAssets > 0 ? netIncome / totalAssets : 0,
          roe: equity > 0 ? netIncome / equity : 0
        },
        operacional: {
          rotacionInventario: inventory > 0 ? costOfGoodsSold / inventory : 0,
          rotacionCuentasPorCobrar: accountsReceivable > 0 ? revenue / accountsReceivable : 0
        },
        liquidezCorriente: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
        liquidezRapida: currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0,
        endeudamiento: totalAssets > 0 ? totalLiabilities / totalAssets : 0,
        coberturaIntereses: totalLiabilities > 0 ? totalAssets / totalLiabilities : 0,
        margenNeto: revenue > 0 ? netIncome / revenue : 0,
        roa: totalAssets > 0 ? netIncome / totalAssets : 0,
        roe: equity > 0 ? netIncome / equity : 0,
        rotacionInventario: inventory > 0 ? costOfGoodsSold / inventory : 0,
        rotacionCuentasPorCobrar: accountsReceivable > 0 ? revenue / accountsReceivable : 0
      };

      return ratios;
    } catch (error) {
      console.error('Error calculando ratios financieros:', error);
      return null;
    }
  }, [importedData]);

  const generateAlerts = useMemo(() => {
    if (!calculateRatios || !config.enabled) return [];

    const newAlerts: RiskAlert[] = [];
    const ratios = calculateRatios;
    const thresholds = config.thresholds;

    // Alertas de Liquidez
    if (ratios.liquidezCorriente < thresholds.liquidez.corriente.critical) {
      newAlerts.push({
        id: `liquidez-corriente-${Date.now()}`,
        type: 'critical',
        category: 'liquidez',
        title: 'Liquidez Corriente Crítica',
        description: `La liquidez corriente (${ratios.liquidezCorriente.toFixed(2)}) está por debajo del umbral crítico (${thresholds.liquidez.corriente.critical})`,
        recommendation: 'Revisar flujo de caja y considerar refinanciamiento de deudas a corto plazo',
        timestamp: new Date(),
        status: 'active'
      });
    } else if (ratios.liquidezCorriente < thresholds.liquidez.corriente.warning) {
      newAlerts.push({
        id: `liquidez-corriente-warning-${Date.now()}`,
        type: 'high',
        category: 'liquidez',
        title: 'Liquidez Corriente Baja',
        description: `La liquidez corriente (${ratios.liquidezCorriente.toFixed(2)}) está por debajo del umbral de advertencia (${thresholds.liquidez.corriente.warning})`,
        recommendation: 'Monitorear de cerca el flujo de caja y planificar mejoras en la gestión de liquidez',
        timestamp: new Date(),
        status: 'active'
      });
    }

    if (ratios.liquidezRapida < thresholds.liquidez.rapida.critical) {
      newAlerts.push({
        id: `liquidez-rapida-${Date.now()}`,
        type: 'critical',
        category: 'liquidez',
        title: 'Liquidez Rápida Crítica',
        description: `La liquidez rápida (${ratios.liquidezRapida.toFixed(2)}) está por debajo del umbral crítico (${thresholds.liquidez.rapida.critical})`,
        recommendation: 'Reducir inventarios y acelerar cobranza de cuentas por cobrar',
        timestamp: new Date(),
        status: 'active'
      });
    }

    // Alertas de Solvencia
    if (ratios.endeudamiento > thresholds.solvencia.endeudamiento.critical) {
      newAlerts.push({
        id: `endeudamiento-${Date.now()}`,
        type: 'critical',
        category: 'solvencia',
        title: 'Nivel de Endeudamiento Crítico',
        description: `El nivel de endeudamiento (${(ratios.endeudamiento * 100).toFixed(1)}%) supera el umbral crítico (${(thresholds.solvencia.endeudamiento.critical * 100).toFixed(1)}%)`,
        recommendation: 'Implementar plan de reducción de deuda y evaluar reestructuración financiera',
        timestamp: new Date(),
        status: 'active'
      });
    } else if (ratios.endeudamiento > thresholds.solvencia.endeudamiento.warning) {
      newAlerts.push({
        id: `endeudamiento-warning-${Date.now()}`,
        type: 'high',
        category: 'solvencia',
        title: 'Nivel de Endeudamiento Alto',
        description: `El nivel de endeudamiento (${(ratios.endeudamiento * 100).toFixed(1)}%) supera el umbral de advertencia (${(thresholds.solvencia.endeudamiento.warning * 100).toFixed(1)}%)`,
        recommendation: 'Monitorear el nivel de deuda y planificar estrategias de reducción',
        timestamp: new Date(),
        status: 'active'
      });
    }

    if (ratios.solvencia.cobertura < thresholds.solvencia.cobertura.critical) {
      newAlerts.push({
        id: `cobertura-${Date.now()}`,
        type: 'critical',
        category: 'solvencia',
        title: 'Cobertura de Deuda Crítica',
        description: `La cobertura de deuda (${ratios.solvencia.cobertura.toFixed(2)}) está por debajo del umbral crítico (${thresholds.solvencia.cobertura.critical})`,
        recommendation: 'Mejorar la capacidad de cobertura de deudas mediante incremento de activos o reducción de pasivos',
        timestamp: new Date(),
        status: 'active'
      });
    }

    // Alertas de Rentabilidad
    if (ratios.roa < thresholds.rentabilidad.roa.critical) {
      newAlerts.push({
        id: `roa-${Date.now()}`,
        type: 'critical',
        category: 'rentabilidad',
        title: 'ROA Crítico',
        description: `El retorno sobre activos (${(ratios.roa * 100).toFixed(2)}%) está por debajo del umbral crítico (${(thresholds.rentabilidad.roa.critical * 100).toFixed(2)}%)`,
        recommendation: 'Revisar eficiencia operativa y estrategias de generación de ingresos',
        timestamp: new Date(),
        status: 'active'
      });
    }

    if (ratios.roe < thresholds.rentabilidad.roe.critical) {
      newAlerts.push({
        id: `roe-${Date.now()}`,
        type: 'critical',
        category: 'rentabilidad',
        title: 'ROE Crítico',
        description: `El retorno sobre patrimonio (${(ratios.roe * 100).toFixed(2)}%) está por debajo del umbral crítico (${(thresholds.rentabilidad.roe.critical * 100).toFixed(2)}%)`,
        recommendation: 'Evaluar estrategias para mejorar la rentabilidad del patrimonio',
        timestamp: new Date(),
        status: 'active'
      });
    }

    if (ratios.margenNeto < thresholds.rentabilidad.margenNeto.critical) {
      newAlerts.push({
        id: `margen-neto-${Date.now()}`,
        type: 'critical',
        category: 'rentabilidad',
        title: 'Margen Neto Crítico',
        description: `El margen neto (${(ratios.margenNeto * 100).toFixed(2)}%) está por debajo del umbral crítico (${(thresholds.rentabilidad.margenNeto.critical * 100).toFixed(2)}%)`,
        recommendation: 'Revisar estructura de costos y estrategias de precios',
        timestamp: new Date(),
        status: 'active'
      });
    }

    // Alertas Operacionales
    if (ratios.rotacionInventario < thresholds.operacional.rotacionInventario.critical) {
      newAlerts.push({
        id: `rotacion-inventario-${Date.now()}`,
        type: 'critical',
        category: 'operacional',
        title: 'Rotación de Inventario Crítica',
        description: `La rotación de inventario (${ratios.rotacionInventario.toFixed(2)}) está por debajo del umbral crítico (${thresholds.operacional.rotacionInventario.critical})`,
        recommendation: 'Optimizar gestión de inventarios y acelerar rotación de mercancías',
        timestamp: new Date(),
        status: 'active'
      });
    }

    if (ratios.rotacionCuentasPorCobrar < thresholds.operacional.rotacionCuentasPorCobrar.critical) {
      newAlerts.push({
        id: `rotacion-cuentas-${Date.now()}`,
        type: 'critical',
        category: 'operacional',
        title: 'Rotación de Cuentas por Cobrar Crítica',
        description: `La rotación de cuentas por cobrar (${ratios.rotacionCuentasPorCobrar.toFixed(2)}) está por debajo del umbral crítico (${thresholds.operacional.rotacionCuentasPorCobrar.critical})`,
        recommendation: 'Mejorar políticas de cobranza y reducir días de cartera',
        timestamp: new Date(),
        status: 'active'
      });
    }

    return newAlerts;
  }, [calculateRatios, config]);

  useEffect(() => {
    if (generateAlerts.length > 0) {
      setAlerts(generateAlerts);
      setAlertHistory(prev => [...prev, ...generateAlerts]);
    }
  }, [generateAlerts]);

  const filteredAlerts = alerts.filter(alert => {
    const categoryMatch = selectedCategory === 'all' || alert.category === selectedCategory;
    const typeMatch = selectedType === 'all' || alert.type === selectedType;
    return categoryMatch && typeMatch;
  });

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, status: 'acknowledged' } : alert
    ));
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, status: 'resolved' } : alert
    ));
  };

  const updateConfig = (newConfig: Partial<AlertConfiguration>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'high': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'medium': return <Bell className="w-5 h-5 text-yellow-500" />;
      default: return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'acknowledged': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alertas de Riesgo Financiero</h2>
          <p className="text-gray-600">Monitoreo automático de indicadores críticos</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowConfig(!showConfig)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Configuración</span>
          </Button>
        </div>
      </div>

      {showConfig && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Configuración de Alertas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Umbrales de Liquidez */}
            <div>
              <h4 className="font-medium mb-3 text-blue-700">Umbrales de Liquidez</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Liquidez Corriente</label>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-600">Crítico:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.thresholds.liquidez.corriente.critical}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          liquidez: {
                            ...config.thresholds.liquidez,
                            corriente: {
                              ...config.thresholds.liquidez.corriente,
                              critical: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                    <label className="text-xs text-gray-600">Advertencia:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.thresholds.liquidez.corriente.warning}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          liquidez: {
                            ...config.thresholds.liquidez,
                            corriente: {
                              ...config.thresholds.liquidez.corriente,
                              warning: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Liquidez Rápida</label>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-600">Crítico:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.thresholds.liquidez.rapida.critical}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          liquidez: {
                            ...config.thresholds.liquidez,
                            rapida: {
                              ...config.thresholds.liquidez.rapida,
                              critical: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                    <label className="text-xs text-gray-600">Advertencia:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.thresholds.liquidez.rapida.warning}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          liquidez: {
                            ...config.thresholds.liquidez,
                            rapida: {
                              ...config.thresholds.liquidez.rapida,
                              warning: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Umbrales de Solvencia */}
            <div>
              <h4 className="font-medium mb-3 text-green-700">Umbrales de Solvencia</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Endeudamiento (%)</label>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-600">Crítico:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.thresholds.solvencia.endeudamiento.critical}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          solvencia: {
                            ...config.thresholds.solvencia,
                            endeudamiento: {
                              ...config.thresholds.solvencia.endeudamiento,
                              critical: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                    <label className="text-xs text-gray-600">Advertencia:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.thresholds.solvencia.endeudamiento.warning}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          solvencia: {
                            ...config.thresholds.solvencia,
                            endeudamiento: {
                              ...config.thresholds.solvencia.endeudamiento,
                              warning: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Cobertura de Deuda</label>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-600">Crítico:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.thresholds.solvencia.cobertura.critical}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          solvencia: {
                            ...config.thresholds.solvencia,
                            cobertura: {
                              ...config.thresholds.solvencia.cobertura,
                              critical: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                    <label className="text-xs text-gray-600">Advertencia:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.thresholds.solvencia.cobertura.warning}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          solvencia: {
                            ...config.thresholds.solvencia,
                            cobertura: {
                              ...config.thresholds.solvencia.cobertura,
                              warning: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Umbrales de Rentabilidad */}
            <div>
              <h4 className="font-medium mb-3 text-purple-700">Umbrales de Rentabilidad</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Margen Neto (%)</label>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-600">Crítico:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.thresholds.rentabilidad.margenNeto.critical}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          rentabilidad: {
                            ...config.thresholds.rentabilidad,
                            margenNeto: {
                              ...config.thresholds.rentabilidad.margenNeto,
                              critical: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                    <label className="text-xs text-gray-600">Advertencia:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.thresholds.rentabilidad.margenNeto.warning}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          rentabilidad: {
                            ...config.thresholds.rentabilidad,
                            margenNeto: {
                              ...config.thresholds.rentabilidad.margenNeto,
                              warning: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">ROA (%)</label>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-600">Crítico:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.thresholds.rentabilidad.roa.critical}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          rentabilidad: {
                            ...config.thresholds.rentabilidad,
                            roa: {
                              ...config.thresholds.rentabilidad.roa,
                              critical: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                    <label className="text-xs text-gray-600">Advertencia:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.thresholds.rentabilidad.roa.warning}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          rentabilidad: {
                            ...config.thresholds.rentabilidad,
                            roa: {
                              ...config.thresholds.rentabilidad.roa,
                              warning: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">ROE (%)</label>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-600">Crítico:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.thresholds.rentabilidad.roe.critical}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          rentabilidad: {
                            ...config.thresholds.rentabilidad,
                            roe: {
                              ...config.thresholds.rentabilidad.roe,
                              critical: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                    <label className="text-xs text-gray-600">Advertencia:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.thresholds.rentabilidad.roe.warning}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          rentabilidad: {
                            ...config.thresholds.rentabilidad,
                            roe: {
                              ...config.thresholds.rentabilidad.roe,
                              warning: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Umbrales Operacionales */}
            <div className="md:col-span-2 lg:col-span-1">
              <h4 className="font-medium mb-3 text-orange-700">Umbrales Operacionales</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Rotación Inventario</label>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-600">Crítico:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.thresholds.operacional.rotacionInventario.critical}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          operacional: {
                            ...config.thresholds.operacional,
                            rotacionInventario: {
                              ...config.thresholds.operacional.rotacionInventario,
                              critical: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                    <label className="text-xs text-gray-600">Advertencia:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.thresholds.operacional.rotacionInventario.warning}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          operacional: {
                            ...config.thresholds.operacional,
                            rotacionInventario: {
                              ...config.thresholds.operacional.rotacionInventario,
                              warning: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Rotación Cuentas por Cobrar</label>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-600">Crítico:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.thresholds.operacional.rotacionCuentasPorCobrar.critical}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          operacional: {
                            ...config.thresholds.operacional,
                            rotacionCuentasPorCobrar: {
                              ...config.thresholds.operacional.rotacionCuentasPorCobrar,
                              critical: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                    <label className="text-xs text-gray-600">Advertencia:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.thresholds.operacional.rotacionCuentasPorCobrar.warning}
                      onChange={(e) => updateConfig({
                        thresholds: {
                          ...config.thresholds,
                          operacional: {
                            ...config.thresholds.operacional,
                            rotacionCuentasPorCobrar: {
                              ...config.thresholds.operacional.rotacionCuentasPorCobrar,
                              warning: parseFloat(e.target.value)
                            }
                          }
                        }
                      })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Configuraciones adicionales */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-3 text-gray-700">Configuraciones Adicionales</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="notifications-email"
                  checked={config.notifications.email}
                  onChange={(e) => updateConfig({
                    notifications: {
                      ...config.notifications,
                      email: e.target.checked
                    }
                  })}
                  className="rounded"
                />
                <label htmlFor="notifications-email" className="text-sm">Notificaciones por email</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="notifications-sound"
                  checked={config.notifications.sound}
                  onChange={(e) => updateConfig({
                    notifications: {
                      ...config.notifications,
                      sound: e.target.checked
                    }
                  })}
                  className="rounded"
                />
                <label htmlFor="notifications-sound" className="text-sm">Sonido de alertas</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-resolve"
                  checked={config.autoResolve}
                  onChange={(e) => updateConfig({
                    autoResolve: e.target.checked
                  })}
                  className="rounded"
                />
                <label htmlFor="auto-resolve" className="text-sm">Resolución automática</label>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex space-x-4 mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1 border rounded"
          >
            <option value="all">Todas las categorías</option>
            <option value="liquidez">Liquidez</option>
            <option value="solvencia">Solvencia</option>
            <option value="rentabilidad">Rentabilidad</option>
            <option value="operacional">Operacional</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1 border rounded"
          >
            <option value="all">Todos los tipos</option>
            <option value="critical">Crítico</option>
            <option value="high">Alto</option>
            <option value="medium">Medio</option>
            <option value="low">Bajo</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredAlerts.length === 0 ? (
          <Card className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay alertas activas</h3>
            <p className="text-gray-600">Todos los indicadores financieros están dentro de los rangos normales.</p>
          </Card>
        ) : (
          filteredAlerts.map(alert => (
            <Card key={alert.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.type === 'critical' ? 'bg-red-100 text-red-800' :
                        alert.type === 'high' ? 'bg-orange-100 text-orange-800' :
                        alert.type === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.type === 'critical' ? 'Crítico' :
                         alert.type === 'high' ? 'Alto' :
                         alert.type === 'medium' ? 'Medio' : 'Bajo'}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {alert.category}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{alert.description}</p>
                    <p className="text-sm text-blue-600 mb-3">
                      <strong>Recomendación:</strong> {alert.recommendation}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{alert.timestamp.toLocaleString()}</span>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(alert.status)}
                        <span className="capitalize">{alert.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {alert.status === 'active' && (
                    <>
                      <Button
                        onClick={() => acknowledgeAlert(alert.id)}
                        variant="outline"
                        size="sm"
                      >
                        Reconocer
                      </Button>
                      <Button
                        onClick={() => resolveAlert(alert.id)}
                        variant="outline"
                        size="sm"
                      >
                        Resolver
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Sistema de notificaciones integrado */}
      <NotificationSystem
        alerts={alerts}
        onAlertAcknowledge={acknowledgeAlert}
        onAlertResolve={resolveAlert}
      />
    </div>
  );
};

export default RiskAlertsManager;