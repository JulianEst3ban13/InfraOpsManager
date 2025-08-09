export interface QueryHistoryEntry {
  query: string;
  timestamp: string;
  database: string;
  connectionId: number;
  rowsAffected?: number;
  executionTime?: number;
} 