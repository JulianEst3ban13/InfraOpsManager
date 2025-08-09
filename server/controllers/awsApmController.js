import { pool } from "../db.js";

// Convierte epoch (segundos) a DATETIME MySQL
function epochToMySQLDatetime(epoch) {
  console.log("🚀 ~ epochToMySQLDatetime ~ epoch:", epoch)
  const utcDate = new Date(epoch * 1000);
  
  // Obtener el offset de zona horaria local en minutos
  const timezoneOffset = utcDate.getTimezoneOffset();
  
  const localTime = utcDate.getTime() - (timezoneOffset * 60 * 1000);
  const localDate = new Date(localTime);

  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  const hours = String(localDate.getUTCHours()).padStart(2, '0');
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(localDate.getUTCSeconds()).padStart(2, '0');

  const result = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  console.log("🚀 ~ epochToMySQLDatetime ~ localDate:", localDate)
  return result;
}

// Ingesta de métricas desde Telegraf (formato array)
export async function ingestMetrics(req, res) {
  // Log compacto: solo cantidad recibida
  const cantidad = Array.isArray(req.body)
    ? req.body.length
    : (req.body && Array.isArray(req.body.metrics) ? req.body.metrics.length : 0);
  console.log('🔵 Iniciando inserción de métricas. Total:', cantidad);

  let metrics = [];
  let server = null;

  // Soportar ambos formatos: array plano (Telegraf) o { server, metrics }
  if (Array.isArray(req.body)) {
    metrics = req.body;
  } else if (req.body && Array.isArray(req.body.metrics)) {
    metrics = req.body.metrics;
    server = req.body.server;
  } else {
    return res.status(400).json({ message: 'Faltan datos requeridos o formato incorrecto' });
  }

  let countSkipped = 0;
  const values = [];
  try {
    for (const metric of metrics) {
      // Si el body es array, tomar el server de tags.server
      let metricServer = server;
      if (!metricServer && metric.tags && metric.tags.server) {
        metricServer = metric.tags.server;
      }
      const { name, fields, timestamp } = metric;
      if (!metricServer || !name || !fields || !timestamp) {
        countSkipped++;
        continue;
      }
      const mysqlTimestamp = typeof timestamp === 'number'
        ? epochToMySQLDatetime(timestamp)
        : timestamp;
      values.push([metricServer, mysqlTimestamp, name, JSON.stringify(fields)]);
    }
    if (values.length > 0) {
      await pool.query(
        'INSERT INTO server_metrics (server, timestamp, metric_type, metric_data) VALUES ?',[values]
      );
    }
    console.log('🟢 Inserción terminada. Almacenadas:', values.length, 'Ignoradas:', countSkipped);
    res.json({ message: `Métricas almacenadas: ${values.length}, ignoradas: ${countSkipped}` });
  } catch (err) {
    console.error('🔴 Error durante la inserción de métricas:', err);
    res.status(500).json({ message: 'Error al almacenar métricas', error: err.message });
  }
}

// Consulta de métricas por servidor, rango de fechas y tipo
export async function getMetrics(req, res) {
  const { server, from, to, metric_type } = req.query;
  if (!server || !from || !to) {
    return res.status(400).json({ message: 'Faltan parámetros requeridos' });
  }
  try {
    let query = 'SELECT timestamp, metric_type, metric_data FROM server_metrics WHERE server = ? AND timestamp BETWEEN ? AND ?';
    let params = [server, from, to];
    if (metric_type) {
      query += ' AND metric_type = ?';
      params.push(metric_type);
    }
    query += ' ORDER BY timestamp ASC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error al consultar métricas', error: err.message });
  }
}

// Listado de servidores únicos
export async function getServers(req, res) {
  try {
    const [rows] = await pool.query('SELECT DISTINCT server FROM server_metrics');
    res.json(rows.map(r => r.server));
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener servidores', error: err.message });
  }
}

// Estado de servidores con última métrica
export async function getServersStatus(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        server,
        MAX(timestamp) as last_metric,
        COUNT(*) as total_metrics,
        COUNT(CASE WHEN metric_type = 'cpu' THEN 1 END) as cpu_metrics,
        COUNT(CASE WHEN metric_type = 'mem' THEN 1 END) as mem_metrics,
        COUNT(CASE WHEN metric_type = 'disk' THEN 1 END) as disk_metrics,
        COUNT(CASE WHEN metric_type = 'apache' THEN 1 END) as apache_metrics
      FROM server_metrics 
      GROUP BY server
      ORDER BY last_metric DESC
    `);
    
    const now = new Date();
    const serversWithStatus = rows.map(row => {
      // Quitar el 'Z' para que se interprete como hora local
      const lastMetric = new Date(row.last_metric); 
      const minutesSinceLastMetric = Math.floor((now.getTime() - lastMetric.getTime()) / (1000 * 60));
      
      let status = 'offline';
      if (minutesSinceLastMetric <= 10) {
        status = 'online';
      } else if (minutesSinceLastMetric <= 30) {
        status = 'warning';
      }
      
      return {
        server: row.server,
        status,
        lastMetric: row.last_metric,
        minutesSinceLastMetric: Math.max(0, minutesSinceLastMetric), // Evitar valores negativos
        totalMetrics: row.total_metrics,
        hasCpu: row.cpu_metrics > 0 || row.apache_metrics > 0,
        hasMem: row.mem_metrics > 0,
        hasDisk: row.disk_metrics > 0,
        hasApache: row.apache_metrics > 0
      };
    });
    
    res.json(serversWithStatus);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener estado de servidores', error: err.message });
  }
}

// Listado de tipos de métricas únicos
export async function getMetricTypes(req, res) {
  try {
    const [rows] = await pool.query('SELECT DISTINCT metric_type FROM server_metrics');
    res.json(rows.map(r => r.metric_type));
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener tipos de métricas', error: err.message });
  }
} 