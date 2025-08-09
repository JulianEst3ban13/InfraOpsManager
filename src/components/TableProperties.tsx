import React, { useState, useEffect } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import axiosInstance from '../utils/axios';

interface TablePropertiesProps {
  connectionId: number;
  dbType: string;
  schema: string;
  tableName: string;
  onClose: () => void;
}

interface TableDetails {
  name: string;
  schema: string;
  owner: string;
  tablespace: string;
  comment?: string;
  columns: Array<{
    name: string;
    dataType: string;
    length?: number;
    scale?: number;
    notNull: boolean;
    isPrimaryKey: boolean;
    defaultValue?: string;
    comment?: string;
  }>;
  constraints: Array<{
    name: string;
    type: string;
    definition: string;
  }>;
  indexes: Array<{
    name: string;
    definition: string;
  }>;
  policies: Array<{
    name: string;
    definition: string;
  }>;
  triggers: Array<{
    name: string;
    definition: string;
  }>;
}

// Definición de tipos de datos por sistema
const DATA_TYPES = {
  pgsql: {
    numeric: [
      'smallint',
      'integer',
      'bigint',
      'decimal',
      'numeric',
      'real',
      'double precision',
      'serial',
      'bigserial'
    ],
    character: [
      'character varying',
      'varchar',
      'character',
      'char',
      'text'
    ],
    date_time: [
      'timestamp',
      'timestamp with time zone',
      'date',
      'time',
      'time with time zone',
      'interval'
    ],
    boolean: ['boolean'],
    binary: ['bytea'],
    json: ['json', 'jsonb'],
    uuid: ['uuid'],
    other: [
      'money',
      'cidr',
      'inet',
      'macaddr',
      'xml',
      'point',
      'line',
      'circle',
      'box'
    ]
  },
  mysql: {
    numeric: [
      'tinyint',
      'smallint',
      'mediumint',
      'int',
      'bigint',
      'decimal',
      'float',
      'double',
      'bit'
    ],
    character: [
      'char',
      'varchar',
      'tinytext',
      'text',
      'mediumtext',
      'longtext'
    ],
    date_time: [
      'date',
      'datetime',
      'timestamp',
      'time',
      'year'
    ],
    binary: [
      'binary',
      'varbinary',
      'tinyblob',
      'blob',
      'mediumblob',
      'longblob'
    ],
    spatial: [
      'geometry',
      'point',
      'linestring',
      'polygon',
      'multipoint',
      'multilinestring',
      'multipolygon',
      'geometrycollection'
    ],
    json: ['json']
  },
  sqlserver: {
    numeric: [
      'bit',
      'tinyint',
      'smallint',
      'int',
      'bigint',
      'decimal',
      'numeric',
      'float',
      'real',
      'money',
      'smallmoney'
    ],
    character: [
      'char',
      'varchar',
      'text',
      'nchar',
      'nvarchar',
      'ntext'
    ],
    date_time: [
      'date',
      'time',
      'datetime',
      'datetime2',
      'datetimeoffset',
      'smalldatetime'
    ],
    binary: [
      'binary',
      'varbinary',
      'image'
    ],
    other: [
      'uniqueidentifier',
      'xml',
      'sql_variant'
    ]
  },
  mongodb: {
    basic: [
      'String',
      'Number',
      'Boolean',
      'Date',
      'ObjectId',
      'Array',
      'Object',
      'Buffer',
      'Mixed',
      'Decimal128'
    ]
  }
};

const TableProperties: React.FC<TablePropertiesProps> = ({
  connectionId,
  dbType,
  schema,
  tableName,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [tableDetails, setTableDetails] = useState<TableDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState(false);
  const [tempComment, setTempComment] = useState('');
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editedColumns, setEditedColumns] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [sqlPreview, setSqlPreview] = useState<string>('');
  const [apiBaseUrl] = useState<string>(process.env.API_BASE_URL || "http://localhost");

  useEffect(() => {
    const fetchTableDetails = async () => {
      try {
        const response = await axiosInstance.post('/get-table-details', {
          connectionId,
          dbType,
          schema,
          tableName
        });
        setTableDetails(response.data);
        setTempComment(response.data.comment || '');
      } catch (err) {
        setError('Error al cargar los detalles de la tabla');
        console.error('Error fetching table details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTableDetails();
  }, [connectionId, dbType, schema, tableName]);

  const generateSql = () => {
    if (!tableDetails) return '';
    let sql = '';

    // Generar SQL para comentario de tabla si ha sido editado
    if (editingComment && tempComment !== tableDetails.comment) {
      if (dbType === 'pgsql') {
        sql += `COMMENT ON TABLE ${schema}.${tableName}\n  IS '${tempComment.replace(/'/g, "''")}';\n\n`;
      } else if (dbType === 'mysql') {
        sql += `ALTER TABLE ${schema}.${tableName}\n  COMMENT '${tempComment.replace(/'/g, "''")}';\n\n`;
      } else if (dbType === 'sqlserver') {
        sql += `EXEC sp_addextendedproperty\n  @name = N'MS_Description',\n  @value = N'${tempComment.replace(/'/g, "''")}',\n  @level0type = N'SCHEMA', @level0name = ${schema},\n  @level1type = N'TABLE', @level1name = ${tableName};\n\n`;
      }
    }

    // Generar SQL para cambios en columnas
    Object.entries(editedColumns).forEach(([columnName, columnData]) => {
      const originalColumn = tableDetails.columns.find(col => col.name === columnName);
      if (!originalColumn) return;

      // Extraer el tipo de dato base y la longitud original
      let originalDataType = originalColumn.dataType;
      let originalLength = originalColumn.length?.toString();

      const match = originalDataType.match(/^(.*?)\((\d+)\)$/);
      if (match) {
        originalDataType = match[1].trim();
        originalLength = match[2];
      }

      // Verificar si realmente hay cambios
      const hasChanges = 
        columnData.dataType !== originalDataType ||
        columnData.length !== originalLength ||
        columnData.notNull !== originalColumn.notNull ||
        columnData.defaultValue !== originalColumn.defaultValue ||
        columnData.comment !== originalColumn.comment;

      if (!hasChanges) return;

      // Construir la definición del tipo de dato
      let typeDefinition = columnData.dataType;
      if (columnData.length && ['varchar', 'char', 'character varying', 'character'].includes(columnData.dataType.toLowerCase())) {
        typeDefinition += `(${columnData.length})`;
      }

      if (dbType === 'pgsql') {
        let alterations = [];

        // Cambio de tipo de dato
        if (columnData.dataType !== originalDataType || columnData.length !== originalLength) {
          if (columnData.dataType === 'text') {
            alterations.push(`ALTER COLUMN ${columnName} TYPE ${columnData.dataType} COLLATE pg_catalog."default"`);
          } else {
            alterations.push(`ALTER COLUMN ${columnName} TYPE ${typeDefinition}`);
          }
        }

        // Cambio de NOT NULL
        if (columnData.notNull !== originalColumn.notNull) {
          alterations.push(`ALTER COLUMN ${columnName} ${columnData.notNull ? 'SET' : 'DROP'} NOT NULL`);
        }

        // Cambio de valor por defecto
        if (columnData.defaultValue !== originalColumn.defaultValue) {
          if (columnData.defaultValue) {
            alterations.push(`ALTER COLUMN ${columnName} SET DEFAULT ${columnData.defaultValue}`);
          } else {
            alterations.push(`ALTER COLUMN ${columnName} DROP DEFAULT`);
          }
        }

        if (alterations.length > 0) {
          sql += `ALTER TABLE ${schema}.${tableName}\n    ${alterations.join(',\n    ')};\n\n`;
        }

        // Comentario de columna
        if (columnData.comment !== originalColumn.comment) {
          sql += `COMMENT ON COLUMN ${schema}.${tableName}.${columnName}\n  IS '${(columnData.comment || '').replace(/'/g, "''")}';\n\n`;
        }
      } else if (dbType === 'mysql') {
        // Para MySQL, usamos MODIFY COLUMN que combina todos los cambios en una sola sentencia
        let columnDef = `MODIFY COLUMN ${columnName} ${typeDefinition}`;
        columnDef += columnData.notNull ? ' NOT NULL' : ' NULL';
        
        if (columnData.defaultValue) {
          columnDef += ` DEFAULT ${columnData.defaultValue}`;
        }
        
        if (columnData.comment) {
          columnDef += ` COMMENT '${columnData.comment.replace(/'/g, "''")}'`;
        }
        
        sql += `ALTER TABLE ${schema}.${tableName}\n    ${columnDef};\n\n`;
      } else if (dbType === 'sqlserver') {
        // Para SQL Server
        let alterations = [];
        
        if (columnData.dataType !== originalDataType || columnData.length !== originalLength || columnData.notNull !== originalColumn.notNull) {
          let columnDef = `ALTER COLUMN ${columnName} ${typeDefinition}`;
          columnDef += columnData.notNull ? ' NOT NULL' : ' NULL';
          alterations.push(columnDef);
        }

        if (alterations.length > 0) {
          sql += `ALTER TABLE ${schema}.${tableName}\n    ${alterations.join(',\n    ')};\n\n`;
        }

        // Comentario de columna para SQL Server
        if (columnData.comment !== originalColumn.comment) {
          sql += `EXEC sp_updateextendedproperty\n  @name = N'MS_Description',\n  @value = N'${columnData.comment || ''}',\n  @level0type = N'SCHEMA', @level0name = ${schema},\n  @level1type = N'TABLE', @level1name = ${tableName},\n  @level2type = N'COLUMN', @level2name = ${columnName};\n\n`;
        }
      }
    });

    return sql.trim();
  };

  useEffect(() => {
    setSqlPreview(generateSql());
  }, [editingComment, tempComment, editedColumns, tableDetails]);

  const handleCommentSave = async () => {
    if (!tableDetails) return;
    setSaving(true);
    try {
      await axiosInstance.post('/update-table-comment', {
        connectionId,
        dbType,
        schema,
        tableName,
        comment: tempComment,
        sql: generateSql()
      });
      setTableDetails({
        ...tableDetails,
        comment: tempComment
      });
      setEditingComment(false);
      setSqlPreview('');
    } catch (error) {
      console.error('Error al guardar el comentario:', error);
      setError('Error al guardar el comentario');
    } finally {
      setSaving(false);
    }
  };

  const handleColumnEdit = (columnName: string) => {
    if (!tableDetails) return;
    const column = tableDetails.columns.find(col => col.name === columnName);
    if (column) {
      // Separar el tipo de dato de la longitud si está incluida
      let dataType = column.dataType;
      let length = column.length;

      // Si el tipo de dato incluye longitud entre paréntesis, extraerla
      const match = dataType.match(/^(.*?)\((\d+)\)$/);
      if (match) {
        dataType = match[1].trim();
        length = parseInt(match[2], 10);
      }

      setEditedColumns({
        ...editedColumns,
        [columnName]: {
          ...column,
          dataType,
          length,
          notNull: column.notNull,
          defaultValue: column.defaultValue || null,
          comment: column.comment || null
        }
      });
      setEditingColumn(columnName);
    }
  };

  const handleColumnChange = (columnName: string, field: string, value: any) => {
    const editedColumn = editedColumns[columnName];
    if (!editedColumn) return;

    let processedValue = value;
    if (field === 'length') {
      // Mantener el valor exacto como string
      processedValue = value === '' ? null : value;
      if (processedValue !== null) {
        const numValue = parseInt(processedValue, 10);
        if (isNaN(numValue) || numValue < 1) {
          setError('La longitud debe ser mayor a 0');
          return;
        }
        // Mantener el valor original sin procesar
        processedValue = value;
      }
      console.log('Nuevo valor de longitud:', processedValue);
    }

    setError(null);
    const updatedColumn = {
      ...editedColumn,
      [field]: processedValue
    };

    console.log('Columna actualizada:', {
      columnName,
      field,
      originalValue: value,
      processedValue,
      updatedColumn
    });

    setEditedColumns({
      ...editedColumns,
      [columnName]: updatedColumn
    });

    // Generar SQL con los cambios actualizados
    setTimeout(() => {
      const sql = generateSql();
      console.log('SQL generado después del cambio:', sql);
      setSqlPreview(sql);
    }, 0);
  };

  const handleColumnSave = async (columnName: string) => {
    if (!tableDetails || !editedColumns[columnName]) return;
    setSaving(true);
    setError(null);

    try {
      const originalColumn = tableDetails.columns.find(col => col.name === columnName);
      const editedColumn = editedColumns[columnName];

      // Validar la longitud básica
      if (typeof editedColumn.length === 'number') {
        if (editedColumn.length < 1) {
          throw new Error('La longitud debe ser mayor a 0');
        }
      }

      const sql = generateSql();
      console.log('SQL a ejecutar:', sql);

      // Enviar los datos originales junto con los cambios para validación en el backend
      await axiosInstance.post('/update-column', {
        connectionId,
        dbType,
        schema,
        tableName,
        columnName,
        columnData: editedColumns[columnName],
        originalData: originalColumn,
        sql
      });
      
      // Actualizar el estado local con los cambios
      setTableDetails({
        ...tableDetails,
        columns: tableDetails.columns.map(col => 
          col.name === columnName ? {
            ...editedColumns[columnName],
            dataType: editedColumns[columnName].dataType + 
              (editedColumns[columnName].length ? `(${editedColumns[columnName].length})` : '')
          } : col
        )
      });
      
      setEditingColumn(null);
      const newEditedColumns = { ...editedColumns };
      delete newEditedColumns[columnName];
      setEditedColumns(newEditedColumns);
      setSqlPreview('');
      
    } catch (error: any) {
      console.error('Error al guardar la columna:', error);
      
      // Mostrar mensaje de error más descriptivo
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('Error al guardar los cambios de la columna. Por favor, verifica los valores ingresados.');
      }
    } finally {
      setSaving(false);
    }
  };

  const renderDataTypeSelect = (columnName: string, currentType: string) => {
    const editedColumn = editedColumns[columnName];
    const types = DATA_TYPES[dbType as keyof typeof DATA_TYPES];
    
    if (!types) return null;

    return (
      <select
        value={editedColumn.dataType}
        onChange={(e) => handleColumnChange(columnName, 'dataType', e.target.value)}
        className="w-full border rounded px-2 py-1"
      >
        {Object.entries(types).map(([category, typeList]) => (
          <optgroup key={category} label={category.replace('_', ' ').toUpperCase()}>
            {typeList.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    );
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'columns', label: 'Columnas' },
    { id: 'sql', label: 'SQL' },
    { id: 'constraints', label: 'Restricciones' },
    { id: 'indexes', label: 'Índices' },
    { id: 'triggers', label: 'Triggers' }
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl">
          <h3 className="text-red-600 mb-4">Error</h3>
          <p>{error}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-4/5 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Propiedades de la tabla: {schema}.{tableName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 flex-1 overflow-auto">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : !tableDetails ? (
            <div className="text-center text-gray-500">No se pudieron cargar los detalles de la tabla</div>
          ) : (
            <>
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nombre</label>
                      <input
                        type="text"
                        value={tableDetails.name}
                        readOnly
                        className="mt-1 block w-full border rounded-md px-3 py-2 text-gray-700 bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Propietario</label>
                      <input
                        type="text"
                        value={tableDetails.owner}
                        readOnly
                        className="mt-1 block w-full border rounded-md px-3 py-2 text-gray-700 bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Schema</label>
                      <input
                        type="text"
                        value={tableDetails.schema}
                        readOnly
                        className="mt-1 block w-full border rounded-md px-3 py-2 text-gray-700 bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tablespace</label>
                      <input
                        type="text"
                        value={tableDetails.tablespace}
                        readOnly
                        className="mt-1 block w-full border rounded-md px-3 py-2 text-gray-700 bg-gray-50"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-gray-700">Comentario</label>
                      {!editingComment ? (
                        <button
                          onClick={() => setEditingComment(true)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={16} />
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={handleCommentSave}
                            disabled={saving}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingComment(false);
                              setTempComment(tableDetails.comment || '');
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    {editingComment ? (
                      <textarea
                        value={tempComment}
                        onChange={(e) => setTempComment(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full border rounded-md px-3 py-2 text-gray-700"
                        placeholder="Agregar un comentario..."
                      />
                    ) : (
                      <textarea
                        value={tableDetails.comment || ''}
                        readOnly
                        rows={3}
                        className="mt-1 block w-full border rounded-md px-3 py-2 text-gray-700 bg-gray-50"
                      />
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'columns' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo de dato
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Longitud/Precisión
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          No nulo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Clave primaria
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor por defecto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Comentario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tableDetails.columns.map((column, idx) => {
                        const isEditing = editingColumn === column.name;
                        const editedColumn = editedColumns[column.name];
                        
                        return (
                          <tr key={column.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {column.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {isEditing ? (
                                renderDataTypeSelect(column.name, column.dataType)
                              ) : column.dataType}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editedColumn.length || ''}
                                  onChange={(e) => handleColumnChange(column.name, 'length', e.target.value)}
                                  min="1"
                                  className="w-full border rounded px-2 py-1"
                                />
                              ) : (column.length || '-')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {isEditing ? (
                                <input
                                  type="checkbox"
                                  checked={editedColumn.notNull}
                                  onChange={(e) => setEditedColumns({
                                    ...editedColumns,
                                    [column.name]: { ...editedColumn, notNull: e.target.checked }
                                  })}
                                  className="rounded border-gray-300"
                                />
                              ) : (
                                <input type="checkbox" checked={column.notNull} readOnly />
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <input 
                                type="checkbox" 
                                checked={column.isPrimaryKey} 
                                readOnly 
                                className="cursor-not-allowed opacity-50"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editedColumn.defaultValue || ''}
                                  onChange={(e) => setEditedColumns({
                                    ...editedColumns,
                                    [column.name]: { ...editedColumn, defaultValue: e.target.value }
                                  })}
                                  className="w-full border rounded px-2 py-1"
                                />
                              ) : (column.defaultValue || '-')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editedColumn.comment || ''}
                                  onChange={(e) => setEditedColumns({
                                    ...editedColumns,
                                    [column.name]: { ...editedColumn, comment: e.target.value }
                                  })}
                                  className="w-full border rounded px-2 py-1"
                                />
                              ) : (column.comment || '-')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleColumnSave(column.name)}
                                    disabled={saving}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    <Save size={16} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingColumn(null);
                                      const newEditedColumns = { ...editedColumns };
                                      delete newEditedColumns[column.name];
                                      setEditedColumns(newEditedColumns);
                                    }}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleColumnEdit(column.name)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'sql' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {sqlPreview || 'No hay cambios pendientes'}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'constraints' && (
                <div className="space-y-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Definición
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tableDetails.constraints.map((constraint, idx) => (
                        <tr key={constraint.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {constraint.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {constraint.type}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <pre className="whitespace-pre-wrap font-mono">{constraint.definition}</pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'indexes' && (
                <div className="space-y-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Definición
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tableDetails.indexes.map((index, idx) => (
                        <tr key={index.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <pre className="whitespace-pre-wrap font-mono">{index.definition}</pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'triggers' && (
                <div className="space-y-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Definición
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tableDetails.triggers.map((trigger, idx) => (
                        <tr key={trigger.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {trigger.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <pre className="whitespace-pre-wrap font-mono">{trigger.definition}</pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableProperties; 