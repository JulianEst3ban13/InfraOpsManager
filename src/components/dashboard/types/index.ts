export interface MetricsDashboardProps {
  darkMode: boolean;
}

export interface Metricas {
  total: number;
  exitosos: number;
  fallidos: number;
  en_proceso: number;
}

export interface ConexionesMetricas {
  total: number;
  mysql: number;
  postgresql: number;
}

export interface InformesMetricas {
  total: number;
  porMes: Array<{
    mes: string;
    total: number;
  }>;
  porCliente: Array<{
    cliente: string;
    total: number;
    mes: string;
  }>;
}

export interface ThemeColors {
  bg: string;
  text: string;
  card: string;
  border: string;
  hover: string;
}

export interface ChartColors {
  tendencia: string;
  distribucion: string[];
  informes: string;
}

export const COLORS = {
  primary: "#4F46E5",
  secondary: "#8B5CF6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  light: "#F9FAFB",
  dark: "#1F2937",
  bgLight: "#FFFFFF",
  bgDark: "#111827",
  textLight: "#111827",
  textDark: "#F9FAFB",
  chartColors: ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6"]
}; 