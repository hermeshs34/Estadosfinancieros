export interface RiskAlert {
  id: string;
  type: 'critical' | 'high' | 'medium' | 'low';
  category: 'liquidez' | 'solvencia' | 'rentabilidad' | 'operacional' | 'mercado';
  title: string;
  description: string;
  value?: number;
  threshold?: number;
  recommendation: string;
  priority?: number;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export interface AlertThresholds {
  liquidez: {
    corriente: { critical: number; warning: number };
    rapida: { critical: number; warning: number };
  };
  solvencia: {
    endeudamiento: { critical: number; warning: number };
    cobertura: { critical: number; warning: number };
  };
  rentabilidad: {
    margenNeto: { critical: number; warning: number };
    roa: { critical: number; warning: number };
    roe: { critical: number; warning: number };
  };
  operacional: {
    rotacionInventario: { critical: number; warning: number };
    rotacionCuentasPorCobrar: { critical: number; warning: number };
  };
}

export interface AlertConfiguration {
  enabled: boolean;
  thresholds: AlertThresholds;
  notifications: {
    email: boolean;
    dashboard: boolean;
    sound: boolean;
  };
  autoResolve: boolean;
  retentionDays: number;
}