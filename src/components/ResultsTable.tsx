import React, { useState, useCallback, useMemo } from 'react';
import { Loader2, ArrowUpDown } from 'lucide-react';

interface ResultsTableProps {
  results: any[];
  columns: string[];
  loading: boolean;
  error: string | null;
  rowCount: number | null;
  executionTime: number | null;
}

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

const ResultsTable: React.FC<ResultsTableProps> = ({
  results = [],
  columns = [],
  loading,
  error,
  rowCount,
  executionTime
}: ResultsTableProps): JSX.Element => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const getRowBackground = (rowIdx: number): string => {
    if (hoveredRow === rowIdx) return 'bg-blue-50';
    return rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
  };

  const calculateColumnWidth = useCallback((colIndex: number): number => {
    if (!columns[colIndex]) return 150;

    const headerLength = columns[colIndex].length || 0;
    let maxContentLength = headerLength;

    results.forEach((row) => {
      const cellContent = row[columns[colIndex]];
      const stringContent = cellContent !== null && cellContent !== undefined ? String(cellContent) : '';
      maxContentLength = Math.max(maxContentLength, Math.min(stringContent.length, 50));
    });

    const minWidth = 80;
    const charWidth = 8;
    const padding = 24;

    return Math.min(Math.max(minWidth, (maxContentLength * charWidth) + padding), 500);
  }, [columns, results]);

  const formatCellValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">NULL</span>;
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    const stringValue = String(value);
    if (stringValue.length > 100) {
      return (
        <div className="max-w-[200px] truncate" title={stringValue}>
          {stringValue.substring(0, 100)}...
        </div>
      );
    }

    return stringValue;
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-start pt-20 h-full">
          <div className="bg-white border border-gray-100 rounded-lg p-6 text-center shadow-sm max-w-md mx-auto">
            <Loader2 className="animate-spin h-10 w-10 mb-4 text-blue-500 mx-auto" />
            <p className="text-gray-600 font-medium">Ejecutando consulta...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-start pt-20 h-full">
          <div className="bg-red-50 border border-red-100 rounded-lg p-6 text-center shadow-sm max-w-md mx-auto">
            <span className="material-icons text-red-500 text-3xl mb-3">error_outline</span>
            <h3 className="text-lg font-medium text-red-800 mb-2">Error al ejecutar la consulta</h3>
            <div className="bg-white p-3 rounded border border-red-100 text-left">
              <p className="text-sm text-red-600 whitespace-pre-wrap font-mono">{error}</p>
            </div>
          </div>
        </div>
      );
    }

    if (columns.length === 0) {
      return (
        <div className="flex flex-col items-center justify-start h-full" style={{ paddingTop: '10px' }}>
          <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-6 text-center shadow-md max-w-lg mx-auto">
            <div className="text-blue-500 text-4xl mb-3 font-bold">info</div>
            <h2 className="text-xl font-bold text-blue-800 mb-3">Base de datos lista</h2>
            <p className="text-blue-700 mb-4 text-lg">Ejecuta una consulta para ver los resultados</p>
            <div className="bg-white p-3 rounded border border-blue-200 text-left shadow-inner mx-auto max-w-md">
              <code className="text-blue-600 font-mono text-base">SELECT * FROM tabla LIMIT 100;</code>
            </div>
          </div>
        </div>
      );
    }

    if (results.length === 0) {
      return (
        <div className="flex flex-col items-center justify-start pt-20 h-full">
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-6 text-center shadow-sm max-w-md mx-auto">
            <span className="material-icons text-yellow-500 text-3xl mb-3">search_off</span>
            <h3 className="text-lg font-medium text-yellow-800 mb-2">Sin resultados</h3>
            <p className="text-yellow-600">La consulta no devolvió ningún resultado</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const handleSort = (column: string) => {
    setSortConfig((current) => {
      if (!current || current.column !== column) {
        return { column, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      return null;
    });
  };

  const sortedResults = useMemo(() => {
    if (!sortConfig) return results;

    return [...results].sort((a, b) => {
      const aVal = a[sortConfig.column];
      const bVal = b[sortConfig.column];

      if (aVal === null || aVal === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortConfig.direction === 'asc' ? -1 : 1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [results, sortConfig]);

  const emptyState = renderEmptyState();
  if (emptyState) {
    return emptyState;
  }

  return (
    <div className="flex flex-col h-full w-full bg-white">
      <div className="bg-gray-50 py-2 px-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span>
            <span className="font-medium">Total:</span> {results.length} registros
          </span>
          {executionTime !== null && (
            <span>
              <span className="font-medium">Tiempo:</span> {executionTime} ms
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded">
            <span className="material-icons text-base">file_download</span>
          </button>
          <button className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded">
            <span className="material-icons text-base">print</span>
          </button>
        </div>
      </div>
      <div className="overflow-auto flex-1 w-full" style={{ overflowX: 'auto', overflowY: 'auto' }}>
        <div className="min-w-max w-full">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {columns.map((column) => (
                  <th 
                    key={`header-${column}`}
                    onClick={() => handleSort(column)}
                    className="bg-gray-100 border-b border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-200 transition-colors duration-150 select-none group"
                    style={{ 
                      minWidth: calculateColumnWidth(columns.indexOf(column)),
                      maxWidth: calculateColumnWidth(columns.indexOf(column))
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {column}
                      <ArrowUpDown size={14} 
                        className={`transition-opacity duration-150 ${sortConfig?.column === column ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'} 
                        ${sortConfig?.column === column && sortConfig.direction === 'desc' ? 'transform rotate-180' : ''}`}
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedResults.map((row, rowIdx) => {
                const rowBackground = getRowBackground(rowIdx);
                
                return (
                  <tr 
                    key={Object.values(row).join('-')}
                    className={`hover:bg-blue-50 transition-colors duration-150 ${rowBackground}`}
                    onMouseEnter={() => setHoveredRow(rowIdx)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {columns.map((column) => (
                      <td 
                        key={`cell-${column}-${row[column]}`}
                        className="border-b border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition-colors duration-150"
                        style={{ 
                          minWidth: calculateColumnWidth(columns.indexOf(column)),
                          maxWidth: calculateColumnWidth(columns.indexOf(column)),
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={String(row[column])}
                      >
                        {formatCellValue(row[column])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResultsTable;