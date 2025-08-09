import React from 'react';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  results: any[];
  columns: string[];
  onError: (message: string) => void;
}

const ExportButton: React.FC<ExportButtonProps> = ({ results, columns, onError }) => {
  const escapeCsvValue = (value: any) => {
    if (value === null || value === undefined) return 'NULL';
    const strValue = String(value);
    return `"${strValue.replace(/"/g, '""')}"`;
  };

  const downloadResults = (format: 'csv' | 'json') => {
    if (!results || results.length === 0) {
      onError('No hay resultados para exportar');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `query_results_${timestamp}`;

    if (format === 'csv') {
      // Agregar BOM para UTF-8
      let content = '\ufeff';
      
      // CSV headers con comillas
      content += columns.map(col => `"${col}"`).join(',') + '\n';
      
      // CSV data
      results.forEach(row => {
        content += columns.map(col => {
          const value = row[col];
          if (value === null || value === undefined) return '"NULL"';
          if (typeof value === 'object') return `"${String(value).replace(/"/g, '""')}"`;
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',') + '\n';
      });

      const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
      downloadFile(blob, `${filename}.csv`);
    } else {
      // JSON
      const content = JSON.stringify(results, (key, value) => {
        if (value === null) return 'NULL';
        if (typeof value === 'bigint') return value.toString();
        return value;
      }, 2);

      const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
      downloadFile(blob, `${filename}.json`);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative group">
      <button 
        className="flex items-center bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
        aria-haspopup="true"
        aria-expanded={false}
      >
        <Download size={16} className="mr-1" /> Exportar
      </button>
      <div className="absolute left-0 mt-1 w-32 bg-white shadow-lg rounded-md py-1 z-10 hidden group-hover:block">
        <button 
          onClick={() => downloadResults('csv')}
          className="block w-full text-left px-4 py-2 hover:bg-gray-100"
        >
          CSV
        </button>
        <button 
          onClick={() => downloadResults('json')}
          className="block w-full text-left px-4 py-2 hover:bg-gray-100"
        >
          JSON
        </button>
      </div>
    </div>
  );
};

export default ExportButton; 