import pkg from 'pg';
const { Pool } = pkg;
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import mssql from 'mssql';
import { pool } from '../db.js';

const executeQuery = async (req, res) => {
    const { connectionId, query, dbType } = req.body;
    let connection = null;
    let client = null;

    console.log('🔍 Iniciando ejecución de consulta:', {
        connectionId,
        dbType,
        query
    });

    if (!connectionId || !query || !dbType) {
        return res.status(400).json({ 
            error: 'Faltan parámetros requeridos: connectionId, query o dbType' 
        });
    }

    try {
        // Obtener los detalles de conexión de la base de datos
        const [rows] = await pool.query(
            "SELECT * FROM db_configuraciones WHERE id = ?",
            [connectionId]
        );

        if (rows.length === 0) {
            console.error('❌ No se encontró la configuración de conexión para ID:', connectionId);
            return res.status(404).json({ 
                error: 'No se encontró la configuración de conexión' 
            });
        }

        const dbConfig = rows[0];
        console.log('📋 Configuración de conexión encontrada:', {
            nombre: dbConfig.nombre,
            tipo: dbConfig.tipo_bd,
            host: dbConfig.ip,
            database: dbConfig.basededatos
        });

        let results;

        try {
            switch (dbType.toLowerCase()) {
                case 'pgsql':
                    console.log('🔄 Conectando a PostgreSQL...');
                    const pgPool = new Pool({
                        host: dbConfig.ip,
                        user: dbConfig.usuario,
                        password: dbConfig.contraseña,
                        database: dbConfig.basededatos,
                        port: Number(dbConfig.puerto)
                    });
                    client = await pgPool.connect();
                    console.log('✅ Conexión PostgreSQL establecida');
                    const pgResult = await client.query(query);
                    results = pgResult.rows;
                    console.log('📊 Resultados PostgreSQL:', results.length, 'filas');
                    break;

                case 'mysql':
                    console.log('🔄 Conectando a MySQL...');
                    connection = await mysql.createConnection({
                        host: dbConfig.ip,
                        user: dbConfig.usuario,
                        password: dbConfig.contraseña,
                        database: dbConfig.basededatos,
                        port: Number(dbConfig.puerto)
                    });
                    console.log('✅ Conexión MySQL establecida');
                    [results] = await connection.execute(query);
                    console.log('📊 Resultados MySQL:', results.length, 'filas');
                    break;

                case 'sqlserver':
                    console.log('🔄 Conectando a SQL Server...');
                    const sqlConfig = {
                        user: dbConfig.usuario,
                        password: dbConfig.contraseña,
                        database: dbConfig.basededatos,
                        server: dbConfig.ip,
                        port: parseInt(dbConfig.puerto),
                        options: {
                            encrypt: true,
                            trustServerCertificate: true
                        }
                    };
                    await mssql.connect(sqlConfig);
                    console.log('✅ Conexión SQL Server establecida');
                    const sqlResult = await mssql.query(query);
                    results = sqlResult.recordset;
                    console.log('📊 Resultados SQL Server:', results.length, 'filas');
                    break;

                case 'mongodb':
                    console.log('🔄 Conectando a MongoDB...');
                    const mongoUri = `mongodb://${dbConfig.usuario}:${dbConfig.contraseña}@${dbConfig.ip}:${dbConfig.puerto}/${dbConfig.basededatos}`;
                    client = new MongoClient(mongoUri);
                    await client.connect();
                    console.log('✅ Conexión MongoDB establecida');
                    break;

                default:
                    throw new Error(`Tipo de base de datos no soportado: ${dbType}`);
            }

            res.json({ results });

        } catch (error) {
            let errorMessage = error.message;

            // Manejar errores específicos de PostgreSQL
            if (dbType === 'pgsql') {
                if (error.message.includes('relation') && error.message.includes('does not exist')) {
                    errorMessage = `La tabla no existe`;
                } else if (error.message.includes('column') && error.message.includes('does not exist')) {
                    const columnMatch = error.message.match(/column "([^"]+)" does not exist/);
                    const columnName = columnMatch ? columnMatch[1] : 'desconocida';
                    errorMessage = `La columna "${columnName}" no existe en la tabla`;
                }
            }

            console.error('❌ Error al ejecutar consulta:', error);
            res.status(500).json({ 
                success: false,
                error: errorMessage,
                details: error.stack
            });
        } finally {
            try {
                // Cerrar conexiones si es necesario
                if (client) {
                    if (dbType.toLowerCase() === 'pgsql') {
                        await client.release();
                    } else if (dbType.toLowerCase() === 'mongodb') {
                        await client.close();
                    }
                }
                if (connection) {
                    if (dbType === 'pgsql') {
                        await connection.end();
                        console.log('🔌 Conexión PostgreSQL cerrada');
                    } else if (dbType === 'mysql') {
                        await connection.end();
                        console.log('🔌 Conexión MySQL cerrada');
                    } else if (dbType === 'sqlserver') {
                        await mssql.close();
                        console.log('🔌 Conexión SQL Server cerrada');
                    }
                }
            } catch (closeError) {
                console.error('❌ Error al cerrar conexión:', closeError);
            }
        }
    } catch (error) {
        console.error('❌ Error en la ejecución de la consulta:', error);
        res.status(500).json({ 
            error: 'Error en la ejecución de la consulta',
            details: error.message 
        });
    } finally {
        if (client) {
            try {
                if (dbType === 'pgsql') {
                    await client.release();
                    console.log('🔌 Conexión PostgreSQL cerrada');
                } else if (dbType === 'mysql') {
                    await client.end();
                    console.log('🔌 Conexión MySQL cerrada');
                } else if (dbType === 'sqlserver') {
                    await mssql.close();
                    console.log('🔌 Conexión SQL Server cerrada');
                }
            } catch (closeError) {
                console.error('❌ Error al cerrar conexión:', closeError);
            }
        }
    }
};

const getDatabaseStructure = async (req, res) => {
    const { connectionId } = req.params;
    let dbType;
    let connection = null;
    let client = null;

    try {
        // Obtener el tipo de base de datos de la configuración
        const [typeRows] = await pool.query(
            "SELECT tipo_bd FROM db_configuraciones WHERE id = ?",
            [connectionId]
        );

        if (typeRows.length === 0) {
            return res.status(404).json({ error: 'No se encontró la configuración de conexión' });
        }

        dbType = typeRows[0].tipo_bd;
        // Obtener los detalles de conexión
        const [configRows] = await pool.query(
            "SELECT * FROM db_configuraciones WHERE id = ?",
            [connectionId]
        );

        if (configRows.length === 0) {
            return res.status(404).json({ error: 'No se encontró la configuración de conexión' });
        }

        const dbConfig = configRows[0];
        let structure = {
            schemas: [],
            tables: [],
            views: [],
            functions: [],
            triggers: [],
            sequences: []
        };

        try {
            switch (dbType.toLowerCase()) {
                case 'pgsql': {
                    const pgPool = new Pool({
                        host: dbConfig.ip,
                        user: dbConfig.usuario,
                        password: dbConfig.contraseña,
                        database: dbConfig.basededatos,
                        port: Number(dbConfig.puerto)
                    });

                    client = await pgPool.connect();

                    // Obtener schemas
                    const schemaQuery = await client.query(`
                        SELECT schema_name 
                        FROM information_schema.schemata 
                        WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
                        ORDER BY schema_name;
                    `);
                    structure.schemas = schemaQuery.rows.map(row => ({
                        name: row.schema_name,
                        type: 'schema'
                    }));

                    // Obtener tablas
                    const tableQuery = await client.query(`
                        SELECT table_schema, table_name 
                        FROM information_schema.tables 
                        WHERE table_type = 'BASE TABLE' 
                        AND table_schema NOT IN ('pg_catalog', 'information_schema')
                        ORDER BY table_schema, table_name;
                    `);
                    structure.tables = tableQuery.rows.map(row => ({
                        schema: row.table_schema,
                        name: row.table_name,
                        type: 'table'
                    }));

                    // Obtener vistas
                    const viewQuery = await client.query(`
                        SELECT table_schema, table_name 
                        FROM information_schema.views 
                        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                        ORDER BY table_schema, table_name;
                    `);
                    structure.views = viewQuery.rows.map(row => ({
                        schema: row.table_schema,
                        name: row.table_name,
                        type: 'view'
                    }));

                    // Obtener funciones
                    const functionQuery = await client.query(`
                        SELECT n.nspname as schema, p.proname as name
                        FROM pg_proc p 
                        JOIN pg_namespace n ON p.pronamespace = n.oid
                        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
                        ORDER BY n.nspname, p.proname;
                    `);
                    structure.functions = functionQuery.rows.map(row => ({
                        schema: row.schema,
                        name: row.name,
                        type: 'function'
                    }));

                    // Obtener triggers
                    const triggerQuery = await client.query(`
                        SELECT 
                            trigger_schema,
                            trigger_name,
                            event_object_table as table_name
                        FROM information_schema.triggers
                        WHERE trigger_schema NOT IN ('pg_catalog', 'information_schema')
                        ORDER BY trigger_schema, trigger_name;
                    `);
                    structure.triggers = triggerQuery.rows.map(row => ({
                        schema: row.trigger_schema,
                        name: row.trigger_name,
                        table: row.table_name,
                        type: 'trigger'
                    }));

                    // Obtener secuencias
                    const sequenceQuery = await client.query(`
                        SELECT sequence_schema, sequence_name
                        FROM information_schema.sequences
                        WHERE sequence_schema NOT IN ('pg_catalog', 'information_schema')
                        ORDER BY sequence_schema, sequence_name;
                    `);
                    structure.sequences = sequenceQuery.rows.map(row => ({
                        schema: row.sequence_schema,
                        name: row.sequence_name,
                        type: 'sequence'
                    }));
                    break;
                }

                case 'mysql': {
                    connection = await mysql.createConnection({
                        host: dbConfig.ip,
                        user: dbConfig.usuario,
                        password: dbConfig.contraseña,
                        database: dbConfig.basededatos,
                        port: Number(dbConfig.puerto)
                    });

                    // Obtener schemas (bases de datos)
                    const [schemaQuery] = await connection.execute(
                        'SHOW DATABASES;'
                    );
                    structure.schemas = schemaQuery
                        .filter(row => !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(row.Database))
                        .map(row => ({
                            name: row.Database,
                            type: 'schema'
                        }));

                    // Obtener tablas
                    const [tableQuery] = await connection.execute(
                        'SHOW TABLES;'
                    );
                    structure.tables = tableQuery.map(row => ({
                        schema: dbConfig.basededatos,
                        name: Object.values(row)[0],
                        type: 'table'
                    }));

                    // Obtener vistas
                    const [viewQuery] = await connection.execute(`
                        SELECT table_name
                        FROM information_schema.views
                        WHERE table_schema = ?
                        ORDER BY table_name;
                    `, [dbConfig.basededatos]);
                    structure.views = viewQuery.map(row => ({
                        schema: dbConfig.basededatos,
                        name: row.TABLE_NAME,
                        type: 'view'
                    }));

                    // Obtener funciones
                    const [functionQuery] = await connection.execute(`
                        SELECT routine_name
                        FROM information_schema.routines
                        WHERE routine_schema = ?
                        AND routine_type = 'FUNCTION'
                        ORDER BY routine_name;
                    `, [dbConfig.basededatos]);
                    structure.functions = functionQuery.map(row => ({
                        schema: dbConfig.basededatos,
                        name: row.ROUTINE_NAME,
                        type: 'function'
                    }));

                    // Obtener triggers
                    const [triggerQuery] = await connection.execute(`
                        SELECT trigger_name, event_object_table
                        FROM information_schema.triggers
                        WHERE trigger_schema = ?
                        ORDER BY trigger_name;
                    `, [dbConfig.basededatos]);
                    structure.triggers = triggerQuery.map(row => ({
                        schema: dbConfig.basededatos,
                        name: row.TRIGGER_NAME,
                        table: row.EVENT_OBJECT_TABLE,
                        type: 'trigger'
                    }));
                    break;
                }

                case 'sqlserver': {
                    await mssql.connect({
                        user: dbConfig.usuario,
                        password: dbConfig.contraseña,
                        database: dbConfig.basededatos,
                        server: dbConfig.ip,
                        port: parseInt(dbConfig.puerto),
                        options: {
                            encrypt: true,
                            trustServerCertificate: true
                        }
                    });

                    // Obtener schemas
                    const schemaResult = await mssql.query(`
                        SELECT name as schema_name
                        FROM sys.schemas
                        WHERE name NOT IN ('sys', 'INFORMATION_SCHEMA')
                        ORDER BY name;
                    `);
                    structure.schemas = schemaResult.recordset.map(row => ({
                        name: row.schema_name,
                        type: 'schema'
                    }));

                    // Obtener tablas
                    const tableResult = await mssql.query(`
                        SELECT s.name as schema_name, t.name as table_name
                        FROM sys.tables t
                        JOIN sys.schemas s ON t.schema_id = s.schema_id
                        ORDER BY s.name, t.name;
                    `);
                    structure.tables = tableResult.recordset.map(row => ({
                        schema: row.schema_name,
                        name: row.table_name,
                        type: 'table'
                    }));

                    // Obtener vistas
                    const viewResult = await mssql.query(`
                        SELECT s.name as schema_name, v.name as view_name
                        FROM sys.views v
                        JOIN sys.schemas s ON v.schema_id = s.schema_id
                        ORDER BY s.name, v.name;
                    `);
                    structure.views = viewResult.recordset.map(row => ({
                        schema: row.schema_name,
                        name: row.view_name,
                        type: 'view'
                    }));

                    // Obtener funciones
                    const functionResult = await mssql.query(`
                        SELECT s.name as schema_name, o.name as function_name
                        FROM sys.objects o
                        JOIN sys.schemas s ON o.schema_id = s.schema_id
                        WHERE o.type_desc LIKE '%FUNCTION%'
                        ORDER BY s.name, o.name;
                    `);
                    structure.functions = functionResult.recordset.map(row => ({
                        schema: row.schema_name,
                        name: row.function_name,
                        type: 'function'
                    }));

                    // Obtener triggers
                    const triggerResult = await mssql.query(`
                        SELECT s.name as schema_name, t.name as trigger_name,
                               OBJECT_NAME(t.parent_id) as table_name
                        FROM sys.triggers t
                        JOIN sys.objects o ON t.parent_id = o.object_id
                        JOIN sys.schemas s ON o.schema_id = s.schema_id
                        ORDER BY s.name, t.name;
                    `);
                    structure.triggers = triggerResult.recordset.map(row => ({
                        schema: row.schema_name,
                        name: row.trigger_name,
                        table: row.table_name,
                        type: 'trigger'
                    }));
                    break;
                }

                default:
                    throw new Error(`Tipo de base de datos no soportado: ${dbType}`);
            }

            res.json(structure);

        } catch (dbError) {
            console.error(`❌ Error al obtener estructura en ${dbType}:`, dbError);
            res.status(500).json({ 
                error: `Error al obtener estructura: ${dbError.message}`,
                details: dbError.stack
            });
        }

    } catch (error) {
        console.error('❌ Error general:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    } finally {
        try {
            if (client) {
                if (dbType.toLowerCase() === 'pgsql') {
                    await client.release();
                }
            }
            if (connection) {
                await connection.end();
            }
            if (dbType.toLowerCase() === 'sqlserver') {
                await mssql.close();
            }
        } catch (closeError) {
            console.error('❌ Error al cerrar conexión:', closeError);
        }
    }
};
const getConnectionConfig = async (connectionId) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM db_configuraciones WHERE id = ?",
      [connectionId]
    );

    if (rows.length === 0) {
      return null;
    }

    const config = rows[0];
    return {
      host: config.ip,
      user: config.usuario,
      password: config.contraseña,
      database: config.basededatos,
      port: Number(config.puerto)
    };
  } catch (error) {
    console.error('Error getting connection config:', error);
    return null;
  }
};

const getTableDetails = async (req, res) => {
  const { connectionId, dbType, schema, tableName } = req.body;
  let client = null;

  try {
    // Obtener los detalles de conexión de la base de datos
    const [rows] = await pool.query(
      "SELECT * FROM db_configuraciones WHERE id = ?",
      [connectionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontró la configuración de conexión' 
      });
    }

    const dbConfig = rows[0];
    let tableDetails = {
      name: tableName,
      schema: schema,
      owner: '',
      tablespace: '',
      comment: '',
      columns: [],
      constraints: [],
      indexes: [],
      policies: [],
      triggers: []
    };

    if (dbType === 'pgsql') {
      const pgPool = new Pool({
        host: dbConfig.ip,
        user: dbConfig.usuario,
        password: dbConfig.contraseña,
        database: dbConfig.basededatos,
        port: Number(dbConfig.puerto)
      });
      client = await pgPool.connect();

      // Obtener información general de la tabla
      const tableInfoQuery = `
        SELECT 
          t.tableowner as owner,
          COALESCE(ts.spcname, 'pg_default') as tablespace,
          obj_description(c.oid) as comment
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_tables t ON t.schemaname = n.nspname AND t.tablename = c.relname
        LEFT JOIN pg_tablespace ts ON ts.oid = c.reltablespace
        WHERE n.nspname = $1 AND c.relname = $2;
      `;
      const tableInfo = await client.query(tableInfoQuery, [schema, tableName]);
      if (tableInfo.rows.length > 0) {
        tableDetails.owner = tableInfo.rows[0].owner;
        tableDetails.tablespace = tableInfo.rows[0].tablespace;
        tableDetails.comment = tableInfo.rows[0].comment;
      }

      // Obtener información de las columnas
      const columnsQuery = `
        SELECT 
          a.attname as name,
          pg_catalog.format_type(a.atttypid, a.atttypmod) as datatype,
          CASE 
            WHEN a.atttypmod > 0 THEN a.atttypmod - 4
            ELSE NULL 
          END as length,
          a.attnotnull as notnull,
          (SELECT EXISTS (
            SELECT 1 FROM pg_constraint c
            WHERE c.conrelid = a.attrelid
            AND c.conkey[1] = a.attnum
            AND c.contype = 'p'
          )) as isprimarykey,
          pg_get_expr(d.adbin, d.adrelid) as defaultvalue
        FROM pg_attribute a
        LEFT JOIN pg_attrdef d ON (a.attrelid, a.attnum) = (d.adrelid, d.adnum)
        WHERE a.attrelid = $1::regclass
        AND a.attnum > 0
        AND NOT a.attisdropped
        ORDER BY a.attnum;
      `;
      const columns = await client.query(columnsQuery, [`${schema}.${tableName}`]);
      tableDetails.columns = columns.rows.map(col => ({
        name: col.name,
        dataType: col.datatype,
        length: col.length,
        notNull: col.notnull,
        isPrimaryKey: col.isprimarykey,
        defaultValue: col.defaultvalue
      }));

      // Obtener restricciones
      const constraintsQuery = `
        SELECT 
          conname as name,
          pg_get_constraintdef(oid) as definition,
          CASE contype
            WHEN 'c' THEN 'CHECK'
            WHEN 'f' THEN 'FOREIGN KEY'
            WHEN 'p' THEN 'PRIMARY KEY'
            WHEN 'u' THEN 'UNIQUE'
            ELSE contype::text
          END as type
        FROM pg_constraint
        WHERE conrelid = $1::regclass;
      `;
      const constraints = await client.query(constraintsQuery, [`${schema}.${tableName}`]);
      tableDetails.constraints = constraints.rows;

      // Obtener índices
      const indexesQuery = `
        SELECT
          i.relname as name,
          pg_get_indexdef(i.oid) as definition
        FROM pg_index x
        JOIN pg_class i ON i.oid = x.indexrelid
        WHERE x.indrelid = $1::regclass;
      `;
      const indexes = await client.query(indexesQuery, [`${schema}.${tableName}`]);
      tableDetails.indexes = indexes.rows;

      // Obtener políticas RLS
      const policiesQuery = `
        SELECT 
          polname as name,
          pg_get_expr(polqual, polrelid) as definition
        FROM pg_policy
        WHERE polrelid = $1::regclass;
      `;
      const policies = await client.query(policiesQuery, [`${schema}.${tableName}`]);
      tableDetails.policies = policies.rows;

      // Obtener triggers
      const triggersQuery = `
        SELECT 
          tgname as name,
          pg_get_triggerdef(oid) as definition
        FROM pg_trigger
        WHERE tgrelid = $1::regclass
        AND NOT tgisinternal;
      `;
      const triggers = await client.query(triggersQuery, [`${schema}.${tableName}`]);
      tableDetails.triggers = triggers.rows;

    } else if (dbType === 'mysql') {
      client = await mysql.createConnection({
        host: dbConfig.ip,
        user: dbConfig.usuario,
        password: dbConfig.contraseña,
        database: dbConfig.basededatos,
        port: Number(dbConfig.puerto)
      });

      // Obtener información general de la tabla
      const [tableInfo] = await client.query(`
        SELECT 
          TABLE_SCHEMA as \`schema\`,
          TABLE_NAME as name,
          TABLE_COMMENT as comment
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      `, [schema, tableName]);

      if (tableInfo.length > 0) {
        tableDetails.comment = tableInfo[0].comment;
      }

      // Obtener información de las columnas
      const [columns] = await client.query(`
        SELECT 
          COLUMN_NAME as name,
          COLUMN_TYPE as datatype,
          CHARACTER_MAXIMUM_LENGTH as length,
          NUMERIC_SCALE as scale,
          IS_NULLABLE = 'NO' as notnull,
          COLUMN_KEY = 'PRI' as isprimarykey,
          COLUMN_DEFAULT as defaultvalue
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [schema, tableName]);

      tableDetails.columns = columns.map(col => ({
        name: col.name,
        dataType: col.datatype,
        length: col.length,
        scale: col.scale,
        notNull: col.notnull,
        isPrimaryKey: col.isprimarykey,
        defaultValue: col.defaultvalue
      }));

      // Obtener restricciones
      const [constraints] = await client.query(`
        SELECT 
          CONSTRAINT_NAME as name,
          CONSTRAINT_TYPE as type
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      `, [schema, tableName]);
      tableDetails.constraints = constraints;

      // Obtener índices
      const [indexes] = await client.query(`
        SHOW INDEX FROM ${schema}.${tableName}
      `);
      tableDetails.indexes = indexes.map(idx => ({
        name: idx.Key_name,
        definition: `${idx.Index_type} (${idx.Column_name})`
      }));

      // Obtener triggers
      const [triggers] = await client.query(`
        SHOW TRIGGERS FROM ${schema} WHERE \`Table\` = ?
      `, [tableName]);
      tableDetails.triggers = triggers.map(trg => ({
        name: trg.Trigger,
        definition: `${trg.Statement}`
      }));
    }

    res.json(tableDetails);

  } catch (error) {
    console.error('Error getting table details:', error);
    res.status(500).json({ error: 'Error al obtener los detalles de la tabla' });
  } finally {
    if (client) {
      try {
        if (dbType === 'pgsql') {
          await client.release();
        } else if (dbType === 'mysql') {
          await client.end();
        }
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
};

const updateTableComment = async (req, res) => {
  const { schema, tableName } = req.body;
  let client = null;

  try {
    // Obtener los detalles de conexión de la base de datos
    const [rows] = await pool.query(
      "SELECT * FROM db_configuraciones WHERE id = ?",
      [req.body.connectionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontró la configuración de conexión' 
      });
    }

    const dbConfig = rows[0];

    if (req.body.dbType === 'pgsql') {
      const pgPool = new Pool({
        host: dbConfig.ip,
        user: dbConfig.usuario,
        password: dbConfig.contraseña,
        database: dbConfig.basededatos,
        port: Number(dbConfig.puerto)
      });
      client = await pgPool.connect();

      // Ejecutar el SQL generado
      await client.query(req.body.sql);

    } else if (req.body.dbType === 'mysql') {
      client = await mysql.createConnection({
        host: dbConfig.ip,
        user: dbConfig.usuario,
        password: dbConfig.contraseña,
        database: dbConfig.basededatos,
        port: Number(dbConfig.puerto)
      });

      // Ejecutar el SQL generado
      await client.query(req.body.sql);
    } else if (req.body.dbType === 'sqlserver') {
      await mssql.connect({
        user: dbConfig.usuario,
        password: dbConfig.contraseña,
        database: dbConfig.basededatos,
        server: dbConfig.ip,
        port: parseInt(dbConfig.puerto),
        options: {
          encrypt: true,
          trustServerCertificate: true
        }
      });

      // Ejecutar el SQL generado
      await mssql.query(req.body.sql);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error updating table comment:', error);
    res.status(500).json({ error: 'Error al actualizar el comentario de la tabla' });
  } finally {
    if (client) {
      try {
        if (req.body.dbType === 'pgsql') {
          await client.release();
        } else if (req.body.dbType === 'mysql') {
          await client.end();
        } else if (req.body.dbType === 'sqlserver') {
          await mssql.close();
        }
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
};

const updateColumn = async (req, res) => {
  const { connectionId, schema, tableName, columnName, newColumnName, newDataType, newComment, sql } = req.body;
  let client = null;
  let dbType;

  try {
    // Obtener los detalles de conexión de la base de datos
    const [typeRows] = await pool.query(
      "SELECT tipo_bd FROM db_configuraciones WHERE id = ?",
      [connectionId]
    );

    if (typeRows.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontró la configuración de conexión' 
      });
    }

    dbType = typeRows[0].tipo_bd;

    // Obtener los detalles de conexión
    const [configRows] = await pool.query(
      "SELECT * FROM db_configuraciones WHERE id = ?",
      [connectionId]
    );

    if (configRows.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontró la configuración de conexión' 
      });
    }

    const dbConfig = configRows[0];

    try {
      switch (dbType.toLowerCase()) {
        case 'pgsql': {
          const pgPool = new Pool({
            host: dbConfig.ip,
            user: dbConfig.usuario,
            password: dbConfig.contraseña,
            database: dbConfig.basededatos,
            port: Number(dbConfig.puerto)
          });
          client = await pgPool.connect();

          // Ejecutar el SQL generado
          await client.query(sql);
          break;
        }

        case 'mysql': {
          client = await mysql.createConnection({
            host: dbConfig.ip,
            user: dbConfig.usuario,
            password: dbConfig.contraseña,
            database: dbConfig.basededatos,
            port: Number(dbConfig.puerto)
          });

          // Ejecutar el SQL generado
          await client.query(sql);
          break;
        }

        case 'sqlserver': {
          await mssql.connect({
            user: dbConfig.usuario,
            password: dbConfig.contraseña,
            database: dbConfig.basededatos,
            server: dbConfig.ip,
            port: parseInt(dbConfig.puerto),
            options: {
              encrypt: true,
              trustServerCertificate: true
            }
          });

          // Ejecutar el SQL generado
          await mssql.query(sql);
          break;
        }

        default:
          throw new Error(`Tipo de base de datos no soportado: ${dbType}`);
      }

      res.json({ success: true });

    } catch (dbError) {
      console.error(`❌ Error al actualizar columna en ${dbType}:`, dbError);
      res.status(500).json({ 
        error: `Error al actualizar columna: ${dbError.message}`,
        details: dbError.stack
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  } finally {
    try {
      if (client) {
        if (dbType.toLowerCase() === 'pgsql') {
          await client.release();
        } else if (dbType.toLowerCase() === 'mysql') {
          await client.end();
        } else if (dbType.toLowerCase() === 'sqlserver') {
          await mssql.close();
        }
      }
    } catch (closeError) {
      console.error('❌ Error al cerrar conexión:', closeError);
    }
  }
};

export { executeQuery, getDatabaseStructure, getTableDetails, updateTableComment, updateColumn }; 