export interface QueryHistory {
  query: string;
  timestamp: string;
  database: string;
  connectionId: number;
  rowsAffected?: number;
  executionTime?: number;
}

export interface ServerStatus {
  server: string;
  status: 'online' | 'warning' | 'offline';
  lastMetric: string;
  minutesSinceLastMetric: number;
  totalMetrics: number;
  hasCpu: boolean;
  hasMem: boolean;
  hasDisk: boolean;
  hasApache: boolean;
  hasPing: boolean;
}

export interface DatabaseStructure {
  schemas: Array<{ name: string; type: string; }>;
  tables: Array<{ schema: string; name: string; type: string; }>;
  views: Array<{ schema: string; name: string; type: string; }>;
  functions: Array<{ schema: string; name: string; type: string; }>;
  triggers: Array<{ schema: string; name: string; table: string; type: string; }>;
  sequences: Array<{ schema: string; name: string; type: string; }>;
}