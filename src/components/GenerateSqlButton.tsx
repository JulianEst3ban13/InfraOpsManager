import React from 'react';

interface GenerateSqlButtonProps {
  results: any[];
  columns: string[];
  currentQuery: string;
  onError: (message: string) => void;
  onSqlGenerated: (sql: string) => void;
}

const GenerateSqlButton: React.FC<GenerateSqlButtonProps> = ({
  results,
  columns,
  currentQuery,
  onError,
  onSqlGenerated
}) => {
  const generateSQL = (action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE') => {
    if (!results || results.length === 0 || columns.length === 0) {
      onError('No hay resultados para generar SQL');
      return;
    }

    // Intentar obtener el nombre de la tabla de la consulta original
    let tableName = 'table_name';
    const match = currentQuery.match(/FROM\s+([^\s;]+)/i);
    if (match && match[1]) {
      tableName = match[1];
    }

    const firstRow = results[0];
    let generatedSQL = '';

    const formatValue = (value: any): string => {
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'boolean') return value ? '1' : '0';
      if (typeof value === 'object') return `'${escapeSqlValue(JSON.stringify(value))}'`;
      return `'${escapeSqlValue(String(value))}'`;
    };

    switch (action) {
      case 'SELECT':
        generatedSQL = `SELECT ${columns.join(', ')}\nFROM ${tableName}`;
        if (results.length > 0) {
          const whereConditions = columns
            .filter(col => firstRow[col] !== null)
            .map(col => `${col} = ${formatValue(firstRow[col])}`)
            .join('\nAND ');
          if (whereConditions) {
            generatedSQL += `\nWHERE ${whereConditions}`;
          }
        }
        break;

      case 'INSERT':
        generatedSQL = `INSERT INTO ${tableName} (${columns.join(', ')})\nVALUES\n`;
        generatedSQL += results.map(row => {
          return `(${columns.map(col => formatValue(row[col])).join(', ')})`;
        }).join(',\n');
        break;

      case 'UPDATE':
        if (results.length > 0) {
          generatedSQL = `UPDATE ${tableName}\nSET\n`;
          generatedSQL += columns
            .map(col => `    ${col} = ${formatValue(firstRow[col])}`)
            .join(',\n');
          
          // Usar la clave primaria o el primer campo no nulo para el WHERE
          const idColumn = columns.find(col => 
            col.toLowerCase().includes('id') || 
            firstRow[col] !== null
          ) || columns[0];
          
          generatedSQL += `\nWHERE ${idColumn} = ${formatValue(firstRow[idColumn])}`;
        }
        break;

      case 'DELETE':
        if (results.length > 0) {
          generatedSQL = `DELETE FROM ${tableName}\n`;
          const whereConditions = columns
            .filter(col => firstRow[col] !== null)
            .map(col => `${col} = ${formatValue(firstRow[col])}`)
            .join('\nAND ');
          if (whereConditions) {
            generatedSQL += `WHERE ${whereConditions}`;
          }
        }
        break;
    }

    onSqlGenerated(generatedSQL);
  };

  const escapeSqlValue = (value: string) => {
    return value.replace(/'/g, "''");
  };

  return (
    <div className="relative group">
      <button 
        className="flex items-center bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        aria-haspopup="true"
        aria-expanded={false}
      >
        Generar SQL
      </button>
      <div className="absolute left-0 mt-1 w-48 bg-white shadow-lg rounded-md py-1 z-10 hidden group-hover:block">
        <button 
          onClick={() => generateSQL('SELECT')}
          className="block w-full text-left px-4 py-2 hover:bg-gray-100"
        >
          Generar SELECT
        </button>
        <button 
          onClick={() => generateSQL('INSERT')}
          className="block w-full text-left px-4 py-2 hover:bg-gray-100"
        >
          Generar INSERT
        </button>
        <button 
          onClick={() => generateSQL('UPDATE')}
          className="block w-full text-left px-4 py-2 hover:bg-gray-100"
        >
          Generar UPDATE
        </button>
        <button 
          onClick={() => generateSQL('DELETE')}
          className="block w-full text-left px-4 py-2 hover:bg-gray-100"
        >
          Generar DELETE
        </button>
      </div>
    </div>
  );
};

export default GenerateSqlButton; 