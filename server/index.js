import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import pkg from 'pg';
const { Pool: PgPool } = pkg;
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mantenimientoRoutes from "./routes/mantenimiento.js";
import queryRoutes from "./routes/queryRoutes.js";
import openvpnRoutes from "./routes/openvpn.mjs";
import { Server } from "socket.io";
import http from "http"; // Importamos http para crear el servidor
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { capturarTamañoBD, ejecutarTruncate, optimizarBD, ejecutarBackup } from "./utils/mantenimientoUtils.js";
import { enviarCorreo, enviarCorreoRevisionBackup } from "./utils/notificaciones.js";
import { dirname } from "path";
import { fileURLToPath } from "url";
import aiChatRoute from './routes/chatai.js'; 
import path from 'path';
import os from 'os'; // Importamos el módulo os
import downloadRoutes from './routes/download.js'; // Importar rutas de descarga de archivos
import { exec } from 'child_process';
import fs from 'fs/promises';
import { execSync } from 'child_process';
import rolesRoutes from './routes/roles.js';
import permissionsRoutes from './routes/permissions.js';
import { getPermissionsByUser } from './services/permissionService.js';
import { verifyTokenMiddleware } from './utils/authMiddleware.js';
import { checkPermission } from "./utils/permissionMiddleware.js";
import mfaRoutes from './routes/mfa.js';
import awsRoutes from './routes/aws.js';
import awsApmRoutes from './routes/awsApm.js';

// Configuración de variables de entorno
dotenv.config();

// Determinar el entorno de ejecución
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
console.log(`🌍 Entorno: ${NODE_ENV}`);

const app = express();
const PORT = process.env.PORT || 3001;
const SOCKET_PORT = process.env.SOCKET_PORT || 3002;

console.log('🚀 Iniciando servidor...');

// Configuración de CORS según el entorno
const corsOptions = {
  origin: true, // Permitir cualquier origen
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Middleware para manejar path base de la aplicación
app.use('/api', (req, res, next) => {
  console.log(`📌 Request a: ${req.originalUrl} desde ${req.ip}`);
  next();
});

// Endpoint para obtener los permisos del usuario autenticado (¡MOVIDO AQUÍ!)
app.get('/api/me/permissions', verifyTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const permissions = await getPermissionsByUser(userId);
    // Solo permisos activos
    const activePermissions = permissions.filter(p => p.state === 'active');
    res.json(activePermissions);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener permisos del usuario' });
  }
});

// Configuración de seguridad con helmet
app.use(helmet({
  contentSecurityPolicy: isProd ? undefined : false
}));

// Conexión principal de la aplicación (MySQL)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Servidor HTTP principal (API REST)
const server = http.createServer(app);

// Servidor Socket.IO en puerto separado
const ioServer = http.createServer();
const io = new Server(ioServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  },
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Configuración de límite de peticiones
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "You have exceeded the request limit. Demasiadas conexiones.",
  standardHeaders: true,
  handler: (req, res) => {
    console.log(`IP ${req.ip} ha excedido el límite de peticiones`);
    res.status(429).json({ message: 'Demasiadas peticiones. Inténtelo de nuevo en un rato.' });
  },
});

// Middleware para limitar peticiones, excepto para la ruta de ingestión de métricas
app.use((req, res, next) => {
  if (req.path === '/api/aws-apm/metrics/ingest') {
    return next();
  }
  limiter(req, res, next);
});

// Evento de conexión de Socket.IO
io.on("connection", (socket) => {
  console.log("⚡ Nueva conexión de Socket.IO:", {
    id: socket.id,
    ip: socket.handshake.address,
    origin: socket.handshake.headers.origin,
    time: new Date().toISOString()
  });

  // Emitir un evento de prueba para confirmar la conexión
  socket.emit('connection_status', { 
    status: 'connected', 
    message: 'Conexión establecida correctamente',
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Cliente desconectado:", {
      id: socket.id,
      reason,
      time: new Date().toISOString()
    });
  });

  socket.on("error", (error) => {
    console.error("❌ Error en socket:", {
      id: socket.id,
      error: error.message,
      time: new Date().toISOString()
    });
  });
});

// Servir archivos estáticos en producción
if (isProd) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const clientPath = path.join(__dirname, '../client/build');
  
  console.log(`📁 Sirviendo archivos estáticos desde: ${clientPath}`);
  app.use(express.static(clientPath));
}

// Registrar rutas después de inicializar `app`
app.use("/api/mantenimiento", mantenimientoRoutes);
app.use("/api", queryRoutes); // Nueva ruta para consultas
app.use("/api/openvpn", openvpnRoutes); // Rutas para OpenVPN
app.use("/api", downloadRoutes); // Rutas para descargar archivos
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/aws', awsRoutes);
app.use('/api/aws-apm', awsApmRoutes);

// 🚀 **crear conexión y valida**
app.post("/api/conectar-bd", verifyTokenMiddleware, checkPermission('crear_conexiones_bd'), async (req, res) => {
  const { nombre, usuario, contraseña, ip, basededatos, puerto, tipo_bd } = req.body;

  try {
    if (tipo_bd === "mysql") {
      const testConnection = await mysql.createConnection({
        host: ip,
        user: usuario,
        password: contraseña,
        database: basededatos,
        port: Number(puerto),
      });

      await testConnection.end();
    } else if (tipo_bd === "pgsql" || tipo_bd === "postgres") {
      const testConnection = new PgPool({
        host: ip,
        user: usuario,
        password: contraseña,
        database: basededatos,
        port: Number(puerto),
      });

      const client = await testConnection.connect();
      client.release();
    } else {
      return res.status(400).json({ error: "Tipo de base de datos no soportado" });
    }

    await pool.query(
      "INSERT INTO db_configuraciones (nombre, usuario, contraseña, ip, basededatos, puerto, tipo_bd) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [nombre, usuario, contraseña, ip, basededatos, puerto, tipo_bd]
    );

    res.json({ message: `Conexión '${nombre}' guardada correctamente en la BD` });
  } catch (error) {
    console.error("❌ Error al conectar la base de datos:", error);

    let errorMessage;

    switch (error.code) {
      case "ECONNREFUSED":
        errorMessage = `No se pudo conectar a ${ip}:${puerto}. Verifica que la base de datos esté en ejecución.`;
        break;
      case "EHOSTUNREACH":
        errorMessage = `No se puede alcanzar el host ${ip}. Revisa la IP y la conectividad de red.`;
        break;
      case "ER_ACCESS_DENIED_ERROR":
        errorMessage = "Usuario o contraseña incorrectos para MySQL.";
        break;
      case "28P01":
        errorMessage = "Usuario o contraseña incorrectos para PostgreSQL.";
        break;
      case "3D000":
        errorMessage = `La base de datos '${basededatos}' no existe en PostgreSQL.`;
        break;
      case "ER_BAD_DB_ERROR":
        errorMessage = `La base de datos '${basededatos}' no existe en MySQL.`;
        break;
      default:
        errorMessage = "Error desconocido al conectar con la base de datos.";
    }

    res.status(500).json({ error: errorMessage });
  }
});




// 🚀 **Eliminar una conexión de la tabla db_configuraciones**
app.delete("/api/conexiones/:id", verifyTokenMiddleware, checkPermission('eliminar_conexiones_bd'), async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si la conexión existe antes de eliminar
    const [rows] = await pool.query("SELECT * FROM db_configuraciones WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "La conexión no existe" });
    }

    // Eliminar la conexión
    await pool.query("DELETE FROM db_configuraciones WHERE id = ?", [id]);

    res.json({ message: `Conexión con ID ${id} eliminada` });
  } catch (error) {
    console.error("Error al eliminar conexión:", error);
    res.status(500).json({ error: "Error interno al eliminar la conexión" });
  }
});

// 🚀 **Actualizar una conexión en la tabla db_configuraciones**
app.put("/api/conexiones/:id", verifyTokenMiddleware, checkPermission('editar_conexiones_bd'), async (req, res) => {
  const { id } = req.params;
  const { nombre, usuario, contraseña, ip, basededatos, puerto, tipo_bd } = req.body;

  try {
    // Verificar si la conexión existe antes de actualizar
    const [rows] = await pool.query("SELECT * FROM db_configuraciones WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "La conexión no existe" });
    }

    // Actualizar la conexión en la base de datos
    await pool.query(
      "UPDATE db_configuraciones SET nombre = ?, usuario = ?, contraseña = ?, ip = ?, basededatos = ?, puerto = ?, tipo_bd = ? WHERE id = ?",
      [nombre, usuario, contraseña, ip, basededatos, puerto, tipo_bd, id]
    );

    res.json({ message: `Conexión '${nombre}' actualizada correctamente` });
  } catch (error) {
    console.error("Error al actualizar conexión:", error);
    res.status(500).json({ error: "Error interno al actualizar la conexión" });
  }
});


// 🚀 **Obtener todas las conexiones de la tabla db_configuraciones**
app.get("/api/conexiones", verifyTokenMiddleware, checkPermission('ver_conexiones_bd'), async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM db_configuraciones");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener conexiones:", error.message);
    res.status(500).json({ error: "Error interno al obtener las conexiones" });
  }
});

// 🚀 **Obtener configuraciones de la tabla mantenimientos**
app.get("/api/conexionesmantenimiento", async (req, res) => {
  try {
    // Obtener parámetros de paginación (con valores por defecto)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;
    const { estado, fechaInicio, fechaFin, titulo, basededatos } = req.query;

    // Construir condiciones dinámicas
    let where = [];
    let params = [];
    if (estado && estado !== 'todos') {
      where.push('estado = ?');
      params.push(estado);
    }
    if (fechaInicio) {
      where.push('fecha >= ?');
      params.push(fechaInicio);
    }
    if (fechaFin) {
      where.push('fecha <= ?');
      params.push(fechaFin);
    }
    if (titulo) {
      where.push('titulo LIKE ?');
      params.push(`%${titulo}%`);
    }
    if (basededatos) {
      where.push('basededatos LIKE ?');
      params.push(`%${basededatos}%`);
    }
    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Consulta para obtener los datos paginados
    const [rows] = await pool.query(
      `SELECT * FROM mantenimientos ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Consulta para obtener el conteo total
    const [totalRows] = await pool.query(
      `SELECT COUNT(*) as total FROM mantenimientos ${whereClause}`,
      params
    );
    const total = totalRows[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error("Error al obtener conexiones:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 🚀 **Guardar mantenimiento**
app.post("/api/mantenimientos", async (req, res) => {
  const { titulo, descripcion, fecha, basededatos, usuario_id, dbConfig, backup } = req.body;

  try {
    const [result] = await pool.query(`
      INSERT INTO mantenimientos (titulo, descripcion, fecha, estado, basededatos, usuario_id, tamano_antes, tamano_despues, backup) 
      VALUES (?, ?, ?, 'en_proceso', ?, ?, '', '', ?)`,
      [titulo, descripcion, fecha, basededatos, usuario_id, backup]
    );

    const mantenimientoId = result.insertId;

    ejecutarMantenimiento(mantenimientoId, dbConfig, backup);

    res.status(201).json({ message: "Mantenimiento registrado y en proceso" });
  } catch (error) {
    console.error("❌ Error al registrar mantenimiento:", error);
    res.status(500).json({ message: "Error al registrar mantenimiento" });
  }
});

// 🚀 **Ejecutar mantenimiento**
export const ejecutarMantenimiento = async (id, dbConfig, backup) => {
  try {
    console.log(`🔄 Iniciando mantenimiento para ${dbConfig.basededatos}...`);
    await registrarLog(id, `🔄 Mantenimiento iniciado en ${dbConfig.basededatos}`);

    // 📌 Obtener tamaño antes
    const tamanoAntes = await capturarTamañoBD(dbConfig);
    await pool.query(`UPDATE mantenimientos SET tamano_antes = ? WHERE id = ?`, [tamanoAntes, id]);
    await registrarLog(id, `📏 Tamaño antes del mantenimiento: ${tamanoAntes} MB`);

    // 📌 Ejecutar TRUNCATE
    await ejecutarTruncate(dbConfig);
    await registrarLog(id, "✅ TRUNCATE ejecutado.");

    // 📌 Optimizar la base de datos
    await optimizarBD(dbConfig);
    await registrarLog(id, "✅ Optimización completada.");

    // 📌 Obtener tamaño después
    const tamanoDespues = await capturarTamañoBD(dbConfig);
    await pool.query(`UPDATE mantenimientos SET tamano_despues = ? WHERE id = ?`, [tamanoDespues, id]);
    await registrarLog(id, `📏 Tamaño después del mantenimiento: ${tamanoDespues} MB`);

    // 📌 Ejecutar backup si está activado
    if (backup) {
      await ejecutarBackup(dbConfig);
      await pool.query(`UPDATE mantenimientos SET estado = 'exitoso' WHERE id = ?`, [id]);
      await registrarLog(id, "✅ Backup ejecutado.");
    } else {
      await pool.query(`UPDATE mantenimientos SET estado = 'completado' WHERE id = ?`, [id]);
      await registrarLog(id, "✅ Mantenimiento completado.");
    }

    // 📌 Notificar administrador
    await enviarCorreo(
      "juliand@gruponw.com",
      "🔔 Mantenimiento Finalizado",
      `El mantenimiento de la base de datos ${dbConfig.basededatos} se ha completado exitosamente.`
    );

    // 📌 Emitir evento de Socket.IO para notificar a los clientes
    io.emit('mantenimiento-completado', { 
      job_id: id,
      database: dbConfig.basededatos,
      status: backup ? 'exitoso' : 'completado',
      timestamp: new Date().toISOString()
    });
    
    // 📌 También emitir el evento para actualizar la tabla de mantenimientos
    io.emit('mantenimientoActualizado', {
      id,
      titulo: '',
      basededatos: dbConfig.basededatos,
      fecha: new Date().toISOString(),
      estado: backup ? 'exitoso' : 'completado'
    });

    console.log("🎉 Mantenimiento finalizado con éxito.");
  } catch (error) {
    console.error("❌ Error durante el mantenimiento:", error);
    await pool.query(`UPDATE mantenimientos SET estado = 'fallido' WHERE id = ?`, [id]);
    await registrarLog(id, "❌ Mantenimiento fallido.");
    
    // Notificar error vía Socket.IO
    io.emit('mantenimiento-fallido', {
      job_id: id,
      database: dbConfig.basededatos,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    // Actualizar estado en tiempo real
    io.emit('mantenimientoActualizado', {
      id,
      titulo: '',
      basededatos: dbConfig.basededatos,
      fecha: new Date().toISOString(),
      estado: 'fallido'
    });
  }
};

export const registrarLog = async (id, mensaje) => {
  await pool.query("INSERT INTO mantenimiento_logs (mantenimiento_id, mensaje) VALUES (?, ?)", [id, mensaje]);
};




const obtenerTamanoBD = async (dbConfig) => {
  try {
    let query = "";
    let connection;

    if (dbConfig.tipo_bd === "pgsql") {
      connection = new PgPool({
        host: dbConfig.ip,
        user: dbConfig.usuario,
        password: dbConfig.contraseña,
        database: dbConfig.basededatos,
        port: Number(dbConfig.puerto),
      });

      query = `SELECT pg_size_pretty(pg_database_size('${dbConfig.basededatos}')) AS size`;
    } else if (dbConfig.tipo_bd === "mysql") {
      connection = await mysql.createConnection({
        host: dbConfig.ip,
        user: dbConfig.usuario,
        password: dbConfig.contraseña,
        database: dbConfig.basededatos,
        port: Number(dbConfig.puerto),
      });

      query = `
              SELECT CONCAT(ROUND(SUM(data_length + index_length) / 1024 / 1024, 2), ' MB') AS size
              FROM information_schema.tables 
              WHERE table_schema = ?`;
    } else {
      throw new Error("Tipo de base de datos no soportado.");
    }

    const result = await connection.query(query, dbConfig.tipo_bd === "mysql" ? [dbConfig.basededatos] : []);
    const rows = Array.isArray(result) ? result[0] : [];

    await connection.end();

    if (rows.length > 0 && rows[0].size) {
      console.log(`📏 Tamaño de la base de datos (${dbConfig.basededatos}): ${rows[0].size}`);
      return rows[0].size;
    } else {
      console.warn(`⚠️ No se pudo obtener el tamaño de la base de datos ${dbConfig.basededatos}`);
      return "Desconocido";
    }
  } catch (error) {
    console.error("❌ Error al obtener el tamaño de la BD:", error);
    return "Error";
  }
};



// 🔹 Obtener estado de los mantenimientos en tiempo real
app.get("/api/mantenimientos/estado", verifyTokenMiddleware, checkPermission('ver_estado_mantenimientos'), async (req, res) => {
  try {
    const [mantenimientos] = await pool.query("SELECT * FROM mantenimientos ORDER BY fecha DESC LIMIT 10");
    res.json(mantenimientos);
  } catch (error) {
    console.error("❌ Error al obtener mantenimientos:", error);
    res.status(500).json({ error: "Error al obtener los mantenimientos" });
  }
});

app.get("/api/informesrealizados", async (req, res) => {
  try {
    const [mantenimientos] = await pool.query("SELECT * FROM reports ORDER BY fecha DESC LIMIT 10");
    res.json(mantenimientos);
  } catch (error) {
    console.error("❌ Error al obtener mantenimientos:", error);
    res.status(500).json({ error: "Error al obtener los mantenimientos" });
  }
});


// 🚀 **Obtener métricas de mantenimientos**
app.get("/api/mantenimientos/metricas", async (req, res) => {
  try {
    const [total] = await pool.query("SELECT COUNT(*) AS total FROM mantenimientos");
    const [exitosos] = await pool.query("SELECT COUNT(*) AS exitosos FROM mantenimientos WHERE estado IN ('exitoso', 'completado')");
    const [fallidos] = await pool.query("SELECT COUNT(*) AS fallidos FROM mantenimientos WHERE estado = 'fallido'");
    const [enProceso] = await pool.query("SELECT COUNT(*) AS en_proceso FROM mantenimientos WHERE estado = 'en_proceso'");

    res.json({
      total: total[0].total || 0,
      exitosos: exitosos[0].exitosos || 0,
      fallidos: fallidos[0].fallidos || 0,
      en_proceso: enProceso[0].en_proceso || 0,
    });
  } catch (error) {
    console.error("❌ Error al obtener métricas:", error);
    res.status(500).json({ error: "Error al obtener métricas" });
  }
});



// Ruta para obtener bases de datos con estado "Completado"
app.get("/api/bases-de-datos", async (req, res) => {
  try {
    const query = "SELECT * FROM mantenimientos WHERE estado = 'Completado'";
    const [rows] = await pool.query(query); // ← Solo toma la primera parte del array

    console.log("📢 Datos corregidos:", rows); // Verifica si ahora es un array simple

    res.json(rows);
  } catch (error) {
    console.error("❌ Error en la consulta SQL:", error);
    res.status(500).json({ mensaje: "Error al obtener las bases de datos." });
  }
});

// Ruta para obtener informes
app.get("/api/reports", async (req, res) => {
  try {
    const query = "SELECT * FROM reports ORDER BY id DESC";
    const [rows] = await pool.query(query); // ← Solo toma la primera parte del array

    console.log("📢 Datos corregidos:", rows); // Verifica si ahora es un array simple

    res.json(rows);
  } catch (error) {
    console.error("❌ Error en la consulta SQL:", error);
    res.status(500).json({ mensaje: "Error al obtener las bases de datos." });
  }
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import reportsRoutes from "./routes/reports.js";
// 📌 Ruta para generar el informe, guardar en la BD y enviar correo
app.use("/api/reports", reportsRoutes);



app.use("/api/ai", aiChatRoute);

// POST /api/revisiones-backup
app.post('/api/revisiones-backup', verifyTokenMiddleware, checkPermission('crear_revisiones_backup'), async (req, res) => {
  const { 
    fecha_revision, 
    observaciones,
    DB_BR_MYSQL_VISITENTRY,
    DB_BR_PGSQL_SANITCO,
    DB_BR_MYSQL_MOVILMOVE,
    DB_BR_PGSQL_NWADMIN_ARM,
    DB_BR_MYSQL_CONTROLTURNOS,
    DB_BR_PGSQL_SAEPLUS_ARM,
    DB_BR_MYSQL_TASK,
    DB_BR_MYSQL_RINGOW,
    DB_BR_MYSQL_PAGINAS,
    DB_BR_MYSQL_CORREOS,
    DB_USA_SITCA,
    DB_HG_PGSQL_SAJE_ARM
  } = req.body;
  try {
    console.log('📝 Iniciando registro de nueva revisión de backup AWS...');
    
    // Insertar en la base de datos
    const [result] = await pool.query(
      `INSERT INTO revisiones_backup (
        fecha_revision, 
        observaciones,
        DB_BR_MYSQL_VISITENTRY,
        DB_BR_PGSQL_SANITCO,
        DB_BR_MYSQL_MOVILMOVE,
        DB_BR_PGSQL_NWADMIN_ARM,
        DB_BR_MYSQL_CONTROLTURNOS,
        DB_BR_PGSQL_SAEPLUS_ARM,
        DB_BR_MYSQL_TASK,
        DB_BR_MYSQL_RINGOW,
        DB_BR_MYSQL_PAGINAS,
        DB_BR_MYSQL_CORREOS,
        DB_USA_SITCA,
        DB_HG_PGSQL_SAJE_ARM
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fecha_revision, 
        observaciones,
        DB_BR_MYSQL_VISITENTRY || false,
        DB_BR_PGSQL_SANITCO || false,
        DB_BR_MYSQL_MOVILMOVE || false,
        DB_BR_PGSQL_NWADMIN_ARM || false,
        DB_BR_MYSQL_CONTROLTURNOS || false,
        DB_BR_PGSQL_SAEPLUS_ARM || false,
        DB_BR_MYSQL_TASK || false,
        DB_BR_MYSQL_RINGOW || false,
        DB_BR_MYSQL_PAGINAS || false,
        DB_BR_MYSQL_CORREOS || false,
        DB_USA_SITCA || false,
        DB_HG_PGSQL_SAJE_ARM || false
      ]
    );

    console.log('✅ Revisión guardada en base de datos con ID:', result.insertId);
    
    const instanciasRevisadas = [
      DB_BR_MYSQL_VISITENTRY && "DB_BR_MYSQL_VISITENTRY",
      DB_BR_PGSQL_SANITCO && "DB_BR_PGSQL_SANITCO",
      DB_BR_MYSQL_MOVILMOVE && "DB_BR_MYSQL_MOVILMOVE",
      DB_BR_PGSQL_NWADMIN_ARM && "DB_BR_PGSQL_NWADMIN_ARM",
      DB_BR_MYSQL_CONTROLTURNOS && "DB_BR_MYSQL_CONTROLTURNOS",
      DB_BR_PGSQL_SAEPLUS_ARM && "DB_BR_PGSQL_SAEPLUS_ARM",
      DB_BR_MYSQL_TASK && "DB_BR_MYSQL_TASK",
      DB_BR_MYSQL_RINGOW && "DB_BR_MYSQL_RINGOW",
      DB_BR_MYSQL_PAGINAS && "DB_BR_MYSQL_PAGINAS",
      DB_BR_MYSQL_CORREOS && "DB_BR_MYSQL_CORREOS",
      DB_USA_SITCA && "DB_USA_SITCA",
      DB_HG_PGSQL_SAJE_ARM && "DB_HG_PGSQL_SAJE_ARM"
    ].filter(Boolean);

    console.log('📋 Instancias AWS revisadas:', instanciasRevisadas);

    // Enviar correo usando la nueva función específica
    await enviarCorreoRevisionBackup(
      "infraestructura@gruponw.com",
      fecha_revision,
      observaciones,
      instanciasRevisadas
    );

    console.log('✅ Notificación de revisión AWS enviada exitosamente');
    res.json({ message: 'Revisión de backup AWS registrada y notificación enviada' });
  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
    console.error('📍 Stack trace:', error.stack);
    res.status(500).json({ error: 'Error al registrar revisión de backup AWS' });
  }
});


// GET /api/revisiones-backup
app.get('/api/revisiones-backup', verifyTokenMiddleware, checkPermission('ver_revisiones_backup'), async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const fecha = req.query.fecha;
  const offset = (page - 1) * limit;

  try {
    let query = `SELECT revisiones_backup.*, users.username FROM revisiones_backup LEFT JOIN users ON revisiones_backup.usuario_id = users.id`;
    const queryParams = [];

    if (fecha) {
      // Convertir la fecha a formato MySQL y buscar coincidencias en el mismo día
      query += ' WHERE DATE(fecha_revision) = DATE(?)';
      queryParams.push(fecha);
    }

    // Agregar ordenamiento y paginación
    query += ' ORDER BY fecha_revision ASC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const [rows] = await pool.query(query, queryParams);

    // Obtener el conteo total aplicando solo el filtro de fecha
    let countQuery = 'SELECT COUNT(*) as total FROM revisiones_backup';
    const countParams = [];

    if (fecha) {
      countQuery += ' WHERE DATE(fecha_revision) = DATE(?)';
      countParams.push(fecha);
    }

    const [totalRows] = await pool.query(countQuery, countParams);

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: totalRows[0].total,
        totalPages: Math.ceil(totalRows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener revisiones:', error);
    res.status(500).json({ error: 'Error al obtener revisiones' });
  }
});

// PUT /api/revisiones-backup/:id
app.put('/api/revisiones-backup/:id', verifyTokenMiddleware, checkPermission('editar_revisiones_backup'), async (req, res) => {
  const { id } = req.params;
  const { 
    fecha_revision, 
    observaciones,
    DB_BR_MYSQL_VISITENTRY,
    DB_BR_PGSQL_SANITCO,
    DB_BR_MYSQL_MOVILMOVE,
    DB_BR_PGSQL_NWADMIN_ARM,
    DB_BR_MYSQL_CONTROLTURNOS,
    DB_BR_PGSQL_SAEPLUS_ARM,
    DB_BR_MYSQL_TASK,
    DB_BR_MYSQL_RINGOW,
    DB_BR_MYSQL_PAGINAS,
    DB_BR_MYSQL_CORREOS,
    DB_USA_SITCA,
    DB_HG_PGSQL_SAJE_ARM
  } = req.body;

  try {
    const [existingRevision] = await pool.query(
      'SELECT * FROM revisiones_backup WHERE id = ?',
      [id]
    );

    if (existingRevision.length === 0) {
      return res.status(404).json({ error: 'Revisión no encontrada' });
    }

    await pool.query(
      `UPDATE revisiones_backup SET 
        fecha_revision = ?, 
        observaciones = ?,
        DB_BR_MYSQL_VISITENTRY = ?,
        DB_BR_PGSQL_SANITCO = ?,
        DB_BR_MYSQL_MOVILMOVE = ?,
        DB_BR_PGSQL_NWADMIN_ARM = ?,
        DB_BR_MYSQL_CONTROLTURNOS = ?,
        DB_BR_PGSQL_SAEPLUS_ARM = ?,
        DB_BR_MYSQL_TASK = ?,
        DB_BR_MYSQL_RINGOW = ?,
        DB_BR_MYSQL_PAGINAS = ?,
        DB_BR_MYSQL_CORREOS = ?,
        DB_USA_SITCA = ?,
        DB_HG_PGSQL_SAJE_ARM = ?
      WHERE id = ?`,
      [
        fecha_revision,
        observaciones,
        DB_BR_MYSQL_VISITENTRY || false,
        DB_BR_PGSQL_SANITCO || false,
        DB_BR_MYSQL_MOVILMOVE || false,
        DB_BR_PGSQL_NWADMIN_ARM || false,
        DB_BR_MYSQL_CONTROLTURNOS || false,
        DB_BR_PGSQL_SAEPLUS_ARM || false,
        DB_BR_MYSQL_TASK || false,
        DB_BR_MYSQL_RINGOW || false,
        DB_BR_MYSQL_PAGINAS || false,
        DB_BR_MYSQL_CORREOS || false,
        DB_USA_SITCA || false,
        DB_HG_PGSQL_SAJE_ARM || false,
        id
      ]
    );

    res.json({ message: 'Revisión actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar revisión:', error);
    res.status(500).json({ error: 'Error al actualizar revisión' });
  }
});

// DELETE /api/revisiones-backup/:id
app.delete('/api/revisiones-backup/:id', verifyTokenMiddleware, checkPermission('eliminar_revisiones_backup'), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM revisiones_backup WHERE id = ?', [id]);
    res.json({ message: 'Revisión eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar revisión:', error);
    res.status(500).json({ error: 'Error al eliminar revisión' });
  }
});


/////LOGIN
// Middleware para verificar token
// ... Esta función se movió a server/utils/authMiddleware.js ...

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Obtener usuario de la base de datos
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Comparar la contraseña ingresada con la de la base de datos
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Si el usuario tiene MFA configurado, pedir el código MFA
    if (user.mfa_secret) {
      return res.json({ mfaRequired: true, userId: user.id });
    }

    // Crear token con expiración de 2 horas
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Guardar información de la última actividad
    const lastActivity = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.query(
      'UPDATE users SET last_activity = ? WHERE id = ?',
      [lastActivity, user.id]
    );

    // Guardar registro de sesión en user_sessions
    await pool.query(
      'INSERT INTO user_sessions (user_id, username, action, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [user.id, user.username, 'login', req.ip, req.headers['user-agent'] || '']
    );

    res.json({
      message: 'Login successful',
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        picture: user.picture 
      },
      token,
      lastActivity: Date.now() // Enviamos timestamp para el cliente
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Endpoint para verificar token
app.get('/api/verify-token', verifyTokenMiddleware, (req, res) => {
  // Si llegamos aquí, el token es válido (el middleware ya lo verificó)
  res.json({ 
    valid: true, 
    user: req.user 
  });
});

// Endpoint para actualizar la última actividad
app.post('/api/update-activity', verifyTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const lastActivity = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await pool.query(
      'UPDATE users SET last_activity = ? WHERE id = ?',
      [lastActivity, userId]
    );

    res.json({ 
      success: true, 
      lastActivity: Date.now() // Enviamos timestamp para el cliente
    });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Error updating activity' });
  }
});

// Endpoint para obtener todos los usuarios
app.get('/api/users', verifyTokenMiddleware, checkPermission('ver_usuarios'), async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM users');
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Endpoint para obtener perfiles
app.get('/api/profiles', async (req, res) => {
  try {
    const [profiles] = await pool.query('SELECT * FROM profile');
    res.json(profiles);
  } catch (error) {
    console.error('Error al obtener perfiles:', error);
    res.status(500).json({ error: 'Error al obtener perfiles' });
  }
});

// Endpoint para obtener compañías
app.get('/api/companies', async (req, res) => {
  try {
    const [companies] = await pool.query('SELECT * FROM company');
    res.json(companies);
  } catch (error) {
    console.error('Error al obtener compañías:', error);
    res.status(500).json({ error: 'Error al obtener compañías' });
  }
});

// Endpoint para actualizar un usuario
app.put('/api/users/:id', verifyTokenMiddleware, checkPermission('editar_usuarios'), async (req, res) => {
  const { id } = req.params;
  const { username, email, password, company, profile, picture, first_name, last_name, phone, address } = req.body;
  const userEdit = req.headers['x-user-edit'] || 'Sistema'; // Obtener el usuario que realiza la edición

  try {
    let query = 'UPDATE users SET username = ?, email = ?, company = ?, profile = ?, picture = ?, first_name = ?, last_name = ?, phone = ?, address = ?, user_edit = ?, date_edit = NOW()';
    let params = [username, email, company, profile, picture, first_name, last_name, phone, address, userEdit];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);

    // Actualizar el rol principal del usuario en user_roles
    if (profile) {
      // Eliminar todos los roles actuales del usuario
      await pool.query('DELETE FROM user_roles WHERE user_id = ?', [id]);
      // Asignar el nuevo rol principal
      await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [id, profile]);
    }

    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// Endpoint para cambiar la contraseña de un usuario
app.put('/api/users/:id/change-password', verifyTokenMiddleware, checkPermission('cambiar_contrasena_usuarios'), async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const userEdit = req.headers['x-user-edit'] || 'Sistema';

  // Validación de requisitos de contraseña
  const passwordRequirements = [
    { regex: /.{8,}/, message: 'Mínimo 8 caracteres' },
    { regex: /[A-Z]/, message: 'Al menos una letra mayúscula' },
    { regex: /[0-9]/, message: 'Al menos un número' },
    { regex: /[^A-Za-z0-9]/, message: 'Al menos un carácter especial' }
  ];
  const failed = passwordRequirements.filter(req => !req.regex.test(password));
  if (!password) {
    return res.status(400).json({ error: 'La contraseña es requerida' });
  }
  if (failed.length > 0) {
    return res.status(400).json({ error: 'La contraseña no cumple con los requisitos de seguridad: ' + failed.map(f => f.message).join(', ') });
  }

  try {
    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizar la contraseña en la base de datos
    await pool.query(
      'UPDATE users SET password = ?, user_edit = ?, date_edit = NOW() WHERE id = ?',
      [hashedPassword, userEdit, id]
    );

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

// Endpoint para cambiar el estado de un usuario
app.put('/api/users/:id/toggle-state', verifyTokenMiddleware, checkPermission('cambiar_estado_usuarios'), async (req, res) => {
  const { id } = req.params;
  const { state } = req.body;
  const userEdit = req.headers['x-user-edit'] || 'Sistema';

  try {
    await pool.query(
      'UPDATE users SET state = ?, user_edit = ?, date_edit = NOW() WHERE id = ?',
      [state, userEdit, id]
    );
    res.json({ message: 'Estado del usuario actualizado correctamente' });
  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error);
    res.status(500).json({ error: 'Error al cambiar estado del usuario' });
  }
});

// Modificar el endpoint de registro existente
app.post('/api/register', verifyTokenMiddleware, checkPermission('crear_usuarios'), async (req, res) => {
  try {
    const { username, email, password, company, profile, picture, first_name, last_name, phone, address } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email y password son requeridos' });
    }

    // Validación de requisitos de contraseña
    const passwordRequirements = [
      { regex: /.{8,}/, message: 'Mínimo 8 caracteres' },
      { regex: /[A-Z]/, message: 'Al menos una letra mayúscula' },
      { regex: /[0-9]/, message: 'Al menos un número' },
      { regex: /[^A-Za-z0-9]/, message: 'Al menos un carácter especial' }
    ];
    const failed = passwordRequirements.filter(req => !req.regex.test(password));
    if (failed.length > 0) {
      return res.status(400).json({ error: 'La contraseña no cumple con los requisitos de seguridad: ' + failed.map(f => f.message).join(', ') });
    }
    
    // Asignar valores por defecto si no se proporcionan
    const defaultCompany = company || 1; // Valor por defecto para company
    const defaultProfile = profile || 1; // Valor por defecto para profile

    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'El usuario o email ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (username, email, password, company, profile, picture, first_name, last_name, phone, address, state, user_edit, date_edit) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'Sistema', NOW())`,
      [username, email, hashedPassword, defaultCompany, defaultProfile, picture || null, first_name || null, last_name || null, phone || null, address || null]
    );

    const token = jwt.sign(
      { id: result.insertId, username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: result.insertId,
        username,
        email,
        company,
        profile,
        picture,
        first_name,
        last_name,
        phone,
        address
      },
      token
    });

  } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Test database connection
app.get('/api/test', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    res.json({ message: 'Database connection successful' });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Failed to connect to database' });
  }
});

// Start servers
server.listen(PORT, () => {
  const serverIP = getServerIP();
  const baseUrl = process.env.API_BASE_URL || `http://${serverIP}`;
  
  console.log(`🚀 API REST corriendo en ${isProd ? 'producción' : 'desarrollo'}: ${baseUrl}:${PORT}`);
  console.log(`👉 API accesible en: ${baseUrl}:${PORT}/api`);
});

ioServer.listen(SOCKET_PORT, () => {
  const serverIP = getServerIP();
  const baseUrl = process.env.API_BASE_URL || `http://${serverIP}`;
  
  console.log(`⚡ WebSocket corriendo en: ws://${serverIP}:${SOCKET_PORT}`);
  console.log(`📝 Configuración WebSocket:`, {
    port: SOCKET_PORT,
    cors: 'enabled',
    transports: ['websocket', 'polling'],
    pingInterval: '25s',
    pingTimeout: '60s'
  });
});

// Exportamos pool para ser reutilizado en otros módulos
export { pool };

// Manejadores de errores para salida limpia
process.on('SIGINT', () => {
  console.log('🛑 Cerrando servidor por SIGINT');
  server.close(() => {
    console.log('🛑 Servidor HTTP cerrado');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 Cerrando servidor por SIGTERM');
  server.close(() => {
    console.log('🛑 Servidor HTTP cerrado');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('🔴 Error no capturado:', error);
  // No cerramos el servidor, pero registramos el error
});

// GET /api/query-history
app.get('/api/query-history', verifyTokenMiddleware, checkPermission('ver_historial_query'), async (req, res) => {
  const { userId, connectionId } = req.query;
  
  try {
    // Validar que el userId y connectionId sean números válidos
    const userIdNum = Number(userId);
    const connectionIdNum = Number(connectionId);
    
    if (!userIdNum || isNaN(userIdNum)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    if (!connectionIdNum || isNaN(connectionIdNum)) {
      return res.status(400).json({ error: 'ID de conexión inválido' });
    }

    // Construir la consulta base filtrando por usuario y conexión específica
    const query = `
      SELECT qh.*, u.username 
      FROM query_history qh 
      JOIN users u ON qh.user_id = u.id 
      WHERE qh.user_id = ? 
      AND qh.id_database = ?
      ORDER BY qh.execution_timestamp DESC 
      LIMIT 100
    `;
    
    const [history] = await pool.execute(query, [userIdNum, connectionIdNum]);

    // Formatear la respuesta
    const formattedHistory = history.map(entry => ({
      id: entry.id,
      query_text: entry.query_text,
      database_name: entry.database_name,
      rows_affected: entry.rows_affected,
      execution_time: entry.execution_time,
      username: entry.username,
      created_at: entry.execution_timestamp
    }));

    console.log(`Historial obtenido para usuario ${userIdNum} y conexión ${connectionIdNum}:`, formattedHistory.length, 'registros');
    res.json(formattedHistory);
  } catch (error) {
    console.error('Error al obtener el historial:', error);
    res.status(500).json({ 
      error: 'Error al obtener el historial',
      details: error.message 
    });
  }
});

// POST /api/query-history
app.post('/api/query-history', verifyTokenMiddleware, checkPermission('ejecutar_query'), async (req, res) => {
  console.log("Recibiendo petición para guardar historial:", req.body);
  
  const { user_id, username, database_name, id_database, query_text, rows_affected, execution_time } = req.body;

  // Validación mejorada de campos requeridos
  if (!user_id || typeof user_id !== 'number') {
    console.error("Error de validación - user_id inválido:", user_id);
    return res.status(400).json({ error: 'user_id es requerido y debe ser un número' });
  }

  if (!username || !database_name || !id_database || !query_text) {
    console.error("Faltan campos requeridos:", { user_id, username, database_name, id_database, query_text });
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    // Verificar que el usuario existe antes de insertar
    const [userExists] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [user_id]
    );

    if (!userExists.length) {
      console.error("Usuario no encontrado:", user_id);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const [result] = await pool.execute(
      `INSERT INTO query_history 
       (user_id, username, database_name, id_database, query_text, rows_affected, execution_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, username, database_name, id_database, query_text, rows_affected || 0, execution_time || 0]
    );

    console.log("Historial guardado exitosamente:", result);
    res.json({ 
      success: true, 
      id: result.insertId,
      message: 'Historial guardado correctamente'
    });

  } catch (error) {
    console.error("Error al guardar en historial:", error);
    res.status(500).json({ 
      error: 'Error al guardar en el historial',
      details: error.message 
    });
  }
});

// DELETE /api/query-history
app.delete('/api/query-history', verifyTokenMiddleware, checkPermission('ver_historial_query'), async (req, res) => {
  const { userId, databaseName } = req.query;
  try {
    let query = 'DELETE FROM query_history WHERE user_id = ?';
    let params = [userId];
    
    if (databaseName) {
      query += ' AND database_name = ?';
      params.push(databaseName);
    }
    
    await pool.execute(query, params);
    res.json({ message: 'Historial limpiado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al limpiar el historial' });
  }
});

const loadHistory = async () => {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost';
    const response = await axios.get(`${baseUrl}:3001/api/query-history`, {
      params: {
        userId: localStorage.getItem('userId'),
        databaseName: selectedDatabase
      }
    });
    setHistory(response.data);
  } catch (error) {
    console.error("Error al cargar historial:", error);
  }
};

const executeQuery = async (req, res) => {
  console.log("🚀 Iniciando ejecución de query:", queryToExecute);
  
  // 1. Obtener userId del localStorage
  const userId = localStorage.getItem('userId');
  console.log("👤 User ID encontrado:", userId);

  // 2. Obtener el nombre de la base de datos de la conexión actual
  try {
    // Primero obtener la información de la conexión
    const baseUrl = process.env.API_BASE_URL || 'http://localhost';
    const connectionResponse = await axios.get(`${baseUrl}:3001/api/conexiones/${connectionId}`);
    const databaseName = connectionResponse.data.basededatos;
    console.log("💾 Base de datos:", databaseName);

    if (!userId || userId === '0') {
      console.error("No se encontró un userId válido");
      setError('Error: Usuario no identificado');
      return;
    }

    if (!databaseName) {
      console.error("No se encontró el nombre de la base de datos");
      setError('Error: Base de datos no identificada');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setColumns([]);
    setRowCount(null);
    setExecutionTime(null);
    
    const startTime = performance.now();
    
    const response = await axios.post(`${baseUrl}:3001/api/execute-query`, {
      connectionId,
      query: queryToExecute,
      dbType
    });

    const endTime = performance.now();
    const executionTimeMs = Math.round(endTime - startTime);
    setExecutionTime(executionTimeMs);

    if (response.data && response.data.results) {
      const results = response.data.results;
      setResults(results);
      
      if (results.length > 0) {
        setColumns(Object.keys(results[0]));
      }
      
      const rowsAffected = results.length;
      setRowCount(rowsAffected);

      // Guardar en el historial con los datos correctos
      try {
        const historyData = {
          user_id: parseInt(userId),
          database_name: databaseName, // Usar el nombre de la base de datos obtenido
          query_text: queryToExecute,
          rows_affected: rowsAffected,
          execution_time: executionTimeMs
        };

        console.log("💾 Intentando guardar en historial:", historyData);

        const historyResponse = await axios.post(
          `${baseUrl}:3001/api/query-history`,
          historyData
        );

        console.log("✅ Guardado en historial:", historyResponse.data);

        // Actualizar el historial local si es necesario
        if (typeof setHistory === 'function') {
          const newHistoryEntry = {
            query: queryToExecute,
            timestamp: new Date().toISOString(),
            database: databaseName,
            connectionId,
            rowsAffected,
            executionTime: executionTimeMs
          };
          setHistory(prev => [newHistoryEntry, ...prev]);
        }

      } catch (historyError) {
        console.error("❌ Error al guardar en historial:", historyError);
        console.error("Detalles del error:", historyError.response?.data);
      }
    }

  } catch (err) {
    console.error("❌ Error al ejecutar consulta:", err);w
    setError(err.response?.data?.error || 'Error al ejecutar la consulta');
  } finally {
    setLoading(false);
  }
};

// 🚀 **Obtener métricas de conexiones**
app.get("/api/conexiones/metricas", verifyTokenMiddleware, checkPermission('ver_conexiones_bd'), async (req, res) => {
  try {
    const [totalRows] = await pool.query("SELECT COUNT(*) as total FROM db_configuraciones");
    const [mysql] = await pool.query("SELECT COUNT(*) AS mysql FROM db_configuraciones WHERE tipo_bd = 'mysql'");
    const [postgresql] = await pool.query("SELECT COUNT(*) AS postgresql FROM db_configuraciones WHERE tipo_bd = 'pgsql'");

    res.json({
      total: totalRows[0].total || 0,
      mysql: mysql[0].mysql || 0,
      postgresql: postgresql[0].postgresql || 0
    });
  } catch (error) {
    console.error("❌ Error al obtener métricas de conexiones:", error);
    res.status(500).json({ error: "Error al obtener métricas de conexiones" });
  }
});

// 🚀 **Obtener métricas de informes**
app.get("/api/informes/metricas", async (req, res) => {
  try {
    const [total] = await pool.query("SELECT COUNT(*) AS total FROM reports");
    const [porMes] = await pool.query(`
      SELECT 
        DATE_FORMAT(fecha_envio, '%Y-%m') AS mes,
        COUNT(*) AS total
      FROM reports
      GROUP BY DATE_FORMAT(fecha_envio, '%Y-%m')
      ORDER BY mes DESC
      LIMIT 6
    `);

    const [porCliente] = await pool.query(`
      SELECT 
        r.cliente,
        COUNT(*) as total,
        DATE_FORMAT(MAX(r.fecha_envio), '%Y-%m') as mes
      FROM reports r
      GROUP BY r.cliente
      ORDER BY total DESC
      LIMIT 5
    `);

    res.json({
      total: total[0].total || 0,
      porMes: porMes || [],
      porCliente: porCliente || []
    });
  } catch (error) {
    console.error("❌ Error al obtener métricas de informes:", error);
    res.status(500).json({ 
      error: "Error al obtener métricas de informes",
      details: error.message 
    });
  }
});

// Si estamos en producción, cualquier ruta no manejada la redirigimos al frontend
if (isProd) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  // TEMPORALMENTE COMENTADO PARA PROBAR /api/sessions
  // app.get('*', (req, res) => {
  //   if (!req.path.startsWith('/api')) {
  //     res.sendFile(path.join(__dirname, '../client/build/index.html'));
  //   } else {
  //     res.status(404).json({ error: 'API endpoint not found' });
  //   }
  // });
}

// Función utilitaria para obtener la IP del servidor
const getServerIP = () => {
  const interfaces = os.networkInterfaces();
  let serverIP = 'localhost';
  
  // Buscar una dirección IPv4 no interna
  Object.keys(interfaces).forEach((ifname) => {
    interfaces[ifname].forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        serverIP = iface.address;
      }
    });
  });
  
  return serverIP;
};

// Configuración de OpenVPN
const OPENVPN_CONFIG = {
  openvpnBase: '/etc/openvpn',
  clientConfigDir: '/etc/openvpn/ccd',
  easyRsaDir: '/etc/openvpn/easy-rsa',
  statusLog: '/etc/openvpn/status.txt',
  mainLog: '/var/log/syslog',
  serverConf: '/etc/openvpn/server.conf',
  certDir: '/etc/openvpn/keys',
  caCert: '/etc/openvpn/keys/ca.crt',
  serverCert: '/etc/openvpn/keys/server.crt',
  serverKey: '/etc/openvpn/keys/server.key',
  dhParams: '/etc/openvpn/keys/dh2048.pem',
  clientConfigTemplate: '/etc/openvpn/client_template.ovpn'
};

// Función para ejecutar comandos del sistema
const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
};

// Función para formatear bytes
const formatBytes = (bytes) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
};

// Función para parsear el tráfico
const parseTraffic = (value) => {
  if (typeof value === 'string') {
    if (value.includes('KB')) {
      return parseFloat(value.replace(' KB', '')) * 1024;
    } else if (value.includes('MB')) {
      return parseFloat(value.replace(' MB', '')) * 1024 * 1024;
    } else if (value.includes('B')) {
      return parseFloat(value.replace(' B', ''));
    }
  }
  return 0;
};

// Función para obtener el estado detallado de OpenVPN
const getOpenVPNStatus = async () => {
  try {
    const status = await new Promise((resolve) => {
      exec('systemctl status openvpn', (error, stdout) => {
        if (error) {
          resolve({
            isActive: false,
            since: '',
            details: 'Servicio no disponible'
          });
          return;
        }
        
        // Procesar la salida
        const activeMatch = stdout.match(/Active: (\w+)/);
        const sinceMatch = stdout.match(/active.*since (.*?);/);
        
        resolve({
          isActive: activeMatch ? activeMatch[1] === 'active' : false,
          since: sinceMatch ? sinceMatch[1] : '',
          details: stdout.trim()
        });
      });
    });
    
    return status;
  } catch (error) {
    console.error('Error al obtener estado de OpenVPN:', error);
    return {
      isActive: false,
      since: '',
      details: 'Error al obtener estado'
    };
  }
};

// Función para procesar el syslog y obtener usuarios conectados
const processSyslog = async () => {
  try {
    // Leer el archivo syslog desde la ruta correcta
    const syslogContent = await fs.readFile('/var/log/syslog', 'utf8');
    const lines = syslogContent.split('\n');
    const connectedUsers = new Map();
    let isActive = false;

    for (const line of lines) {
      if (line.includes('ovpn-server')) {
        // Verificar si el servidor está activo
        if (line.includes('Peer Connection Initiated')) {
          isActive = true;
        }

        // Buscar conexiones de usuarios
        const userMatch = line.match(/\[([\w]+)\] Peer Connection Initiated/);
        if (userMatch) {
          const username = userMatch[1];
          const ipMatch = line.match(/\[AF_INET\]([\d\.]+):/);
          const ip = ipMatch ? ipMatch[1] : 'Unknown';
          const timestamp = line.split('T')[0];
          
          connectedUsers.set(username, {
            nombre: username,
            ip: ip,
            conexion: timestamp,
            recibido: '0 MB',
            enviado: '0 MB'
          });
        }

        // Buscar desconexiones
        if (line.includes('client-instance restarting')) {
          const disconnectMatch = line.match(/([\w]+)\/[\d\.]+:\d+ SIGUSR1/);
          if (disconnectMatch) {
            const username = disconnectMatch[1];
            connectedUsers.delete(username);
          }
        }

        // Buscar información de tráfico
        const trafficMatch = line.match(/([\w]+)\/[\d\.]+:\d+ Data Channel: cipher/);
        if (trafficMatch) {
          const username = trafficMatch[1];
          if (connectedUsers.has(username)) {
            const user = connectedUsers.get(username);
            // Aquí podrías actualizar la información de tráfico si está disponible
          }
        }
      }
    }

    // Obtener estado detallado del servicio
    const serviceStatus = await getOpenVPNStatus();

    return {
      usuariosActivos: connectedUsers.size,
      estado: serviceStatus.isActive ? 'Activo' : 'Inactivo',
      desde: serviceStatus.since,
      detalles: serviceStatus.details,
      trafico: connectedUsers.size > 0 ? '1.5 GB' : '0 MB',
      clientes: Array.from(connectedUsers.values()),
      actualizado: new Date().toLocaleString()
    };
  } catch (error) {
    console.error('Error procesando syslog:', error);
    throw error;
  }
};

// Endpoint para obtener el estado de OpenVPN
app.get('/api/openvpn/status', async (req, res) => {
  try {
    let response;
    
    try {
      // Intentar obtener datos reales del syslog
      response = await processSyslog();
    } catch (error) {
      console.log('Error al procesar syslog:', error.message);
      // Datos de respaldo en caso de error
      response = {
        usuariosActivos: 0,
        estado: 'Inactivo',
        trafico: '0 MB',
        clientes: [],
        actualizado: new Date().toLocaleString()
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Error al obtener estado de OpenVPN:', error);
    res.json({
      usuariosActivos: 0,
      estado: 'Inactivo',
      trafico: '0 MB',
      clientes: [],
      actualizado: new Date().toLocaleString()
    });
  }
});

// Endpoint para controlar el servicio OpenVPN
app.post('/api/openvpn/service/:action', async (req, res) => {
  const { action } = req.params;
  const validActions = ['start', 'stop', 'restart'];

  if (!validActions.includes(action)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Acción no válida' 
    });
  }

  try {
    await runCommand(`sudo systemctl ${action} openvpn`);
    res.json({ 
      success: true, 
      message: `Servicio OpenVPN ${action} correctamente` 
    });
  } catch (error) {
    console.error(`Error al ${action} OpenVPN:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Endpoint para guardar la configuración de OpenVPN
app.post('/api/openvpn/config', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'El contenido es requerido' });
    }

    // Guardar el contenido en un archivo temporal
    const tempFile = '/tmp/openvpn-server.conf';
    await fs.writeFile(tempFile, content);

    // Mover el archivo a la ubicación correcta con sudo
    execSync(`sudo mv ${tempFile} /etc/openvpn/server.conf`);
    execSync('sudo chmod 644 /etc/openvpn/server.conf');
    execSync('sudo chown root:root /etc/openvpn/server.conf');

    res.json({ message: 'Configuración guardada exitosamente' });
  } catch (error) {
    console.error('Error al guardar la configuración:', error);
    res.status(500).json({ 
      error: 'Error al guardar la configuración',
      details: error.message 
    });
  }
});

// Endpoint para obtener los logs de OpenVPN en tiempo real
app.get('/api/openvpn/logs/stream', (req, res) => {
  // Configurar headers para SSE (Server-Sent Events)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Crear el proceso tail para los logs de OpenVPN
  const tail = exec('sudo tail -f /var/log/syslog | grep ovpn-server', {
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });

  // Manejar la salida del comando
  tail.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString(), log: line })}\n\n`);
    });
  });

  // Manejar errores
  tail.stderr.on('data', (data) => {
    console.error('Error en tail:', data.toString());
    res.write(`data: ${JSON.stringify({ error: data.toString() })}\n\n`);
  });

  // Cleanup cuando el cliente se desconecta
  req.on('close', () => {
    tail.kill();
    res.end();
  });
});

// Endpoint para obtener los últimos N logs
app.get('/api/openvpn/logs/recent', async (req, res) => {
  const lines = parseInt(req.query.lines) || 200; // número de líneas por defecto aumentado a 200

  try {
    const logs = await new Promise((resolve, reject) => {
      // Usar sudo para ejecutar el comando
      exec(`sudo tail -n ${lines} /var/log/syslog | grep ovpn-server`, {
        maxBuffer: 1024 * 1024 // 1MB buffer
      }, (error, stdout, stderr) => {
        if (error) {
          // Si no hay coincidencias de grep, devolver array vacío
          if (error.code === 1 && !stderr) {
            resolve([]);
            return;
          }
          reject(error);
          return;
        }
        resolve(stdout.split('\n').filter(line => line.trim()));
      });
    });

    res.json({
      logs: logs.map(log => ({
        timestamp: new Date().toISOString(),
        log: log
      }))
    });
  } catch (error) {
    console.error('Error al obtener logs recientes:', error);
    res.status(500).json({ 
      error: 'Error al obtener logs',
      details: error.message 
    });
  }
});

// Endpoints para OpenVPN Users
app.post('/api/openvpn/users', async (req, res) => {
  const { username, password, os_type, ip_address } = req.body;

  try {
    // 1. Crear el usuario en el sistema
    await runCommand(`sudo useradd -m -s /bin/false ${username}`);
    
    // 2. Establecer la contraseña
    const proc = exec(`sudo passwd ${username}`, (error, stdout, stderr) => {
      if (error) {
        throw new Error(`Error setting password: ${error.message}`);
      }
    });
    
    proc.stdin.write(`${password}\n${password}\n`);
    proc.stdin.end();

    // 3. Guardar en la base de datos
    const [result] = await pool.query(
      'INSERT INTO openvpn_users (username, os_type, ip_address, created_at) VALUES (?, ?, ?, NOW())',
      [username, os_type, ip_address]
    );

    // 4. Generar archivo de configuración
    const configDir = os_type === 'windows' ? '/etc/openvpn/windows' : '/etc/openvpn/linux';
    await runCommand(`sudo ./generate-config.sh ${username} ${ip_address} ${configDir}`);

    res.json({ 
      success: true, 
      message: 'Usuario creado exitosamente',
      id: result.insertId
    });

  } catch (error) {
    console.error('Error creating OpenVPN user:', error);
    // Limpiar en caso de error
    try {
      await runCommand(`sudo userdel -r ${username}`);
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/openvpn/users', verifyTokenMiddleware, checkPermission('ver_usuarios_vpn'), async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM openvpn_users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    console.error('Error fetching OpenVPN users:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/openvpn/users/:username', async (req, res) => {
  const { username } = req.params;

  try {
    // 1. Eliminar usuario del sistema
    await runCommand(`sudo userdel -r ${username}`);
    
    // 2. Eliminar archivos de configuración
    await runCommand(`sudo rm -f /etc/openvpn/*/client-${username}.ovpn`);
    
    // 3. Eliminar de la base de datos
    await pool.query('DELETE FROM openvpn_users WHERE username = ?', [username]);

    res.json({ 
      success: true, 
      message: 'Usuario eliminado exitosamente' 
    });
  } catch (error) {
    console.error('Error deleting OpenVPN user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/openvpn/config/:username', async (req, res) => {
  const { username } = req.params;
  const { os_type } = req.query;

  try {
    const configDir = os_type === 'windows' ? '/etc/openvpn/windows' : '/etc/openvpn/linux';
    const configPath = `${configDir}/client-${username}.ovpn`;
    
    // Verificar si el archivo existe
    await fs.access(configPath);
    
    if (os_type === 'windows') {
      // Para Windows, crear un ZIP con los archivos necesarios
      const zipPath = `/tmp/${username}-vpn-config.zip`;
      await runCommand(`zip -j ${zipPath} ${configPath} /etc/openvpn/ca.crt`);
      
      res.download(zipPath, `${username}-vpn-config.zip`, (err) => {
        if (err) {
          console.error('Error sending ZIP:', err);
        }
        // Limpiar archivo temporal
        fs.unlink(zipPath).catch(console.error);
      });
    } else {
      // Para Linux, enviar solo el archivo .ovpn
      res.download(configPath, `client.ovpn`);
    }
  } catch (error) {
    console.error('Error downloading OpenVPN config:', error);
    res.status(500).json({ error: 'Error al descargar la configuración' });
  }
});

app.put('/api/openvpn/users/:username/password', async (req, res) => {
  const { username } = req.params;
  const { password } = req.body;

  try {
    const proc = exec(`sudo passwd ${username}`, (error, stdout, stderr) => {
      if (error) {
        throw new Error(`Error changing password: ${error.message}`);
      }
    });
    
    proc.stdin.write(`${password}\n${password}\n`);
    proc.stdin.end();

    res.json({ 
      success: true, 
      message: 'Contraseña actualizada exitosamente' 
    });
  } catch (error) {
    console.error('Error updating OpenVPN user password:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/openvpn/next-ip', async (req, res) => {
  try {
    // Obtener IPs ya utilizadas
    const [users] = await pool.query('SELECT ip_address FROM openvpn_users');
    const usedIPs = users.map(user => user.ip_address);

    // Encontrar la siguiente IP disponible en el rango 10.10.10.2 - 10.10.10.254
    let nextIP = '';
    for (let i = 2; i <= 254; i++) {
      const ip = `10.10.10.${i}`;
      if (!usedIPs.includes(ip)) {
        nextIP = ip;
        break;
      }
    }

    if (!nextIP) {
      throw new Error('No hay IPs disponibles');
    }

    res.json({ ip: nextIP });
  } catch (error) {
    console.error('Error getting next available IP:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener todos los usuarios y si tienen un rol específico
app.get('/api/roles/:roleId/users', verifyTokenMiddleware, checkPermission('asignar_roles'), async (req, res) => {
  const { roleId } = req.params;
  try {
    const [users] = await pool.query(`
      SELECT u.*, 
        CASE WHEN ur.role_id IS NOT NULL THEN 1 ELSE 0 END AS hasRole
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.role_id = ?
    `, [roleId]);
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios para el rol:', error);
    res.status(500).json({ error: 'Error al obtener usuarios para el rol' });
  }
});

// Endpoint para login con MFA
app.post('/api/login/mfa', async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) {
      return res.status(400).json({ error: 'Faltan datos para MFA' });
    }
    // Obtener usuario y secreto
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = rows[0];
    if (!user || !user.mfa_secret) {
      return res.status(400).json({ error: 'MFA no configurado' });
    }
    // Verificar código TOTP
    const speakeasy = await import('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token
    });
    if (!verified) {
      return res.status(401).json({ error: 'Código MFA incorrecto' });
    }
    // Crear token con expiración de 2 horas
    const jwt = await import('jsonwebtoken');
    const authToken = jwt.default.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    // Guardar información de la última actividad
    const lastActivity = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.query(
      'UPDATE users SET last_activity = ? WHERE id = ?',
      [lastActivity, user.id]
    );

    // Guardar registro de sesión en user_sessions
    await pool.query(
      'INSERT INTO user_sessions (user_id, username, action, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [user.id, user.username, 'login', req.ip, req.headers['user-agent'] || '']
    );

    res.json({
      message: 'Login MFA successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        picture: user.picture
      },
      token: authToken,
      lastActivity: Date.now()
    });
  } catch (error) {
    console.error('Login MFA error:', error);
    res.status(500).json({ error: 'Error en login MFA' });
  }
});

// Endpoint para obtener un usuario por ID
app.get('/api/users/:id', verifyTokenMiddleware, checkPermission('ver_usuarios'), async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});



app.post('/api/logout', verifyTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const username = req.user.username;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || '';
    await pool.query(
      'INSERT INTO user_sessions (user_id, username, action, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [userId, username, 'logout', ip, userAgent]
    );
    res.json({ success: true, message: 'Logout registrado' });
  } catch (error) {
    console.error('Error al registrar logout:', error);
    res.status(500).json({ error: 'Error al registrar logout' });
  }
});

console.log('📝 Registrando endpoint /api/sessions...');
app.get('/api/sessions', verifyTokenMiddleware, checkPermission('ver_sesiones'), async (req, res) => {
  console.log('✅ Endpoint /api/sessions registrado y funcionando');
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search ? `%${req.query.search}%` : null;
  const offset = (page - 1) * limit;

  try {
    let baseQuery = 'SELECT * FROM user_sessions';
    let countQuery = 'SELECT COUNT(*) as total FROM user_sessions';
    let where = '';
    let params = [];
    if (search) {
      where = ' WHERE username LIKE ? OR action LIKE ?';
      params.push(search, search);
    }
    const dataQuery = `${baseQuery}${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    const countFullQuery = `${countQuery}${where}`;
    const [dataRows] = await pool.query(dataQuery, [...params, limit, offset]);
    const [countRows] = await pool.query(countFullQuery, params);
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);
    res.json({
      data: dataRows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error al obtener logs de sesiones:', error);
    res.status(500).json({ error: 'Error al obtener logs de sesiones' });
  }
});

app.get('/api/users/:id/sessions', verifyTokenMiddleware, checkPermission('ver_usuarios_session'), async (req, res) => {
  console.log('➡️ Entrando al endpoint /api/users/:id/sessions con id:', req.params.id);
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM user_sessions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100',
      [id]
    );
    console.log('✅ Consulta realizada, registros encontrados:', rows.length);
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener historial de sesiones:', error);
    res.status(500).json({ error: 'Error al obtener historial de sesiones' });
  }
});

// Utilidad para convertir fecha a formato MySQL DATETIME (UTC)
function toMySQLDatetime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}



// 🚀 Obtener mantenimientos por mes para gráficas
app.get("/api/mantenimientos/por-mes", async (req, res) => {
  try {
    const [porMes] = await pool.query(`
      SELECT 
        DATE_FORMAT(fecha, '%Y-%m') AS mes,
        COUNT(*) AS total
      FROM mantenimientos
      GROUP BY DATE_FORMAT(fecha, '%Y-%m')
      ORDER BY mes ASC
    `);
    res.json(porMes);
  } catch (error) {
    console.error("❌ Error al obtener mantenimientos por mes:", error);
    res.status(500).json({ error: "Error al obtener mantenimientos por mes" });
  }
});


// Endpoint para top clientes por mantenimientos
app.get('/api/mantenimientos/top-clientes', async (req, res) => {
  try {
    // Calcular el primer y último día del mes actual
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDayDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastDay = `${lastDayDate.getFullYear()}-${String(lastDayDate.getMonth() + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

    const [rows] = await pool.query(`
      SELECT basededatos AS cliente, COUNT(*) AS total, DATE_FORMAT(MIN(fecha), '%Y-%m') as mes
      FROM mantenimientos
      WHERE fecha IS NOT NULL AND fecha BETWEEN ? AND ?
      GROUP BY basededatos
      ORDER BY total DESC
      LIMIT 5
    `, [firstDay, lastDay]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener top clientes de mantenimientos' });
  }
});

// Endpoint para top clientes por informes del mes actual
app.get('/api/informes/top-clientes', async (req, res) => {
  try {
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDayDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastDay = `${lastDayDate.getFullYear()}-${String(lastDayDate.getMonth() + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

    const [rows] = await pool.query(`
      SELECT cliente, COUNT(*) AS total, DATE_FORMAT(MIN(fecha_envio), '%Y-%m') as mes
      FROM reports
      WHERE fecha_envio IS NOT NULL AND fecha_envio BETWEEN ? AND ?
      GROUP BY cliente
      ORDER BY total DESC
      LIMIT 5
    `, [firstDay, lastDay]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener top clientes de informes' });
  }
});

// Si estamos en producción, cualquier ruta no manejada la redirigimos al frontend
if (isProd) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
}




