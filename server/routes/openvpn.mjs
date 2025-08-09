import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPool } from '../db.js';
import { verifyTokenMiddleware } from '../utils/authMiddleware.js';
import { checkPermission } from '../utils/permissionMiddleware.js';

const router = express.Router();
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = createPool();

// Función para validar IP
const isValidIP = (ip) => {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  
  const [a, b, c, d] = parts.map(Number);
  if (a !== 10 || b !== 10 || c !== 10) return false;
  if (isNaN(d) || d < 2 || d > 254) return false;
  
  return true;
};

// Obtener siguiente IP disponible
router.get('/next-ip', verifyTokenMiddleware, checkPermission('crear_vpn_usuarios'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT ip_address FROM vpn_users ORDER BY ip_address');
    const usedIPs = new Set(rows.map(row => row.ip_address));
    
    for (let i = 2; i <= 254; i++) {
      const ip = `10.10.10.${i}`;
      if (!usedIPs.has(ip)) {
        return res.json({ ip });
      }
    }
    
    res.status(400).json({ error: 'No hay IPs disponibles' });
  } catch (error) {
    console.error('Error al obtener siguiente IP:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear usuario VPN
router.post('/users', verifyTokenMiddleware, checkPermission('crear_vpn_usuarios'), async (req, res) => {
  const { username, password, os_type, ip_address } = req.body;

  // Validaciones
  if (!username || !password || !os_type || !ip_address) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  if (!isValidIP(ip_address)) {
    return res.status(400).json({ error: 'IP inválida' });
  }

  try {
    // Verificar si el usuario ya existe
    const [existingUsers] = await pool.query('SELECT id FROM vpn_users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // Verificar si la IP ya está en uso
    const [existingIPs] = await pool.query('SELECT id FROM vpn_users WHERE ip_address = ?', [ip_address]);
    if (existingIPs.length > 0) {
      return res.status(400).json({ error: 'La IP ya está en uso' });
    }

    // Crear usuario en el sistema
    await execAsync(`sudo adduser --disabled-password --gecos "" ${username}`);
    await execAsync(`echo "${username}:${password}" | sudo chpasswd`);

    // Crear archivo CCD
    const ccdPath = `/etc/openvpn/ccd/${username}`;
    await fs.writeFile(ccdPath, `ifconfig-push ${ip_address} 255.255.255.255\n`);
    await execAsync(`sudo chown root:root ${ccdPath}`);
    await execAsync(`sudo chmod 644 ${ccdPath}`);

    // Agregar usuario al archivo login.conf
    const loginConfPath = os_type === 'windows' ? 
      path.join(__dirname, '../../src/components/docs/awsvpn-win/login.conf') :
      path.join(__dirname, '../../src/components/docs/awsvpn/login.conf');
    
    const loginContent = await fs.readFile(loginConfPath, 'utf8');
    const updatedContent = loginContent + `\n${username}`;
    await fs.writeFile(loginConfPath, updatedContent);

    // Guardar en la base de datos
    await pool.query(
      'INSERT INTO vpn_users (username, os_type, ip_address) VALUES (?, ?, ?)',
      [username, os_type, ip_address]
    );

    res.json({ message: 'Usuario creado exitosamente' });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// Obtener usuarios
router.get('/users', verifyTokenMiddleware, checkPermission('ver_vpn_usuarios'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vpn_users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Eliminar usuario
router.delete('/users/:username', verifyTokenMiddleware, checkPermission('eliminar_vpn_usuarios'), async (req, res) => {
  const { username } = req.params;

  try {
    // Eliminar usuario del sistema
    await execAsync(`sudo userdel -r ${username}`);

    // Eliminar archivo CCD
    const ccdPath = `/etc/openvpn/ccd/${username}`;
    await fs.unlink(ccdPath);

    // Eliminar de login.conf
    const loginConfPaths = [
      path.join(__dirname, '../../src/components/docs/awsvpn/login.conf'),
      path.join(__dirname, '../../src/components/docs/awsvpn-win/login.conf')
    ];

    for (const loginConfPath of loginConfPaths) {
      const content = await fs.readFile(loginConfPath, 'utf8');
      const updatedContent = content
        .split('\n')
        .filter(line => line.trim() !== username)
        .join('\n');
      await fs.writeFile(loginConfPath, updatedContent);
    }

    // Eliminar de la base de datos
    await pool.query('DELETE FROM vpn_users WHERE username = ?', [username]);

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// Descargar configuración
router.get('/config/:username', verifyTokenMiddleware, checkPermission('descargar_config_vpn'), async (req, res) => {
  const { username } = req.params;
  const { os_type } = req.query;

  try {
    const configPath = os_type === 'windows' ?
      path.join(__dirname, '../../src/components/docs/awsvpn-win') :
      path.join(__dirname, '../../src/components/docs/awsvpn/client.ovpn');

    if (os_type === 'windows') {
      // Para Windows, crear un archivo ZIP con todos los archivos necesarios
      const archiver = (await import('archiver')).default;
      const archive = archiver('zip');

      res.attachment('vpn-config.zip');
      archive.pipe(res);

      const files = await fs.readdir(configPath);
      for (const file of files) {
        const filePath = path.join(configPath, file);
        archive.file(filePath, { name: file });
      }

      archive.finalize();
    } else {
      // Para Linux, enviar el archivo de configuración directamente
      res.download(configPath);
    }
  } catch (error) {
    console.error('Error al descargar configuración:', error);
    res.status(500).json({ error: 'Error al descargar configuración' });
  }
});

// Endpoint para obtener los logs recientes
router.get('/logs/recent', verifyTokenMiddleware, checkPermission('ver_vpn_logs'), async (req, res) => {
  const lines = parseInt(req.query.lines) || 200;
  console.log('📖 Intentando leer logs recientes, líneas solicitadas:', lines);

  try {
    // Verificar si el archivo existe y sus permisos
    try {
      const stats = await fs.stat('/var/log/syslog');
      console.log('📄 Información del archivo syslog:', {
        size: stats.size,
        permissions: stats.mode.toString(8),
        owner: stats.uid,
        group: stats.gid
      });
    } catch (error) {
      console.error('❌ Error accediendo a syslog:', error);
      return res.status(500).json({
        error: 'No se puede acceder al archivo de logs',
        details: `Error: ${error.message}. Verifique que el archivo existe y tiene los permisos correctos.`
      });
    }

    console.log('🔍 Ejecutando comando tail y grep...');
    // Intentamos leer los logs con sudo y manejamos mejor el grep
    const command = `sudo tail -n ${lines} /var/log/syslog | grep -a "ovpn-server" || true`;
    console.log('📝 Comando a ejecutar:', command);

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.error('⚠️ Error en comando tail/grep:', stderr);
      return res.status(500).json({
        error: 'Error al leer los logs',
        details: stderr
      });
    }

    // Si no hay coincidencias, devolver array vacío
    const logs = stdout 
      ? stdout.split('\n')
        .filter(line => line.trim())
        .map(log => ({
          timestamp: new Date().toISOString(),
          log: log
        }))
      : [];

    console.log(`✅ Logs obtenidos: ${logs.length} entradas`);
    res.json({ logs });
  } catch (error) {
    console.error('❌ Error al obtener logs recientes:', error);
    res.status(500).json({
      error: 'Error al procesar los logs',
      details: error.message,
      command: error.cmd
    });
  }
});

// Endpoint para streaming de logs
router.get('/logs/stream', verifyTokenMiddleware, checkPermission('ver_vpn_logs'), (req, res) => {
  console.log('🔄 Iniciando streaming de logs...');
  
  // Configurar headers para SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Crear el proceso tail con manejo de errores mejorado
  const command = 'sudo tail -f /var/log/syslog | grep --line-buffered "ovpn-server" || true';
  console.log('📝 Comando streaming:', command);
  
  const tail = exec(command, {
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });

  // Manejar la salida del comando
  tail.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      const eventData = JSON.stringify({
        timestamp: new Date().toISOString(),
        log: line
      });
      res.write(`data: ${eventData}\n\n`);
    });
  });

  // Manejar errores
  tail.stderr.on('data', (data) => {
    console.error('❌ Error en tail:', data.toString());
    const errorData = JSON.stringify({
      error: 'Error al leer logs: ' + data.toString()
    });
    res.write(`data: ${errorData}\n\n`);
  });

  // Cleanup cuando el cliente se desconecta
  req.on('close', () => {
    console.log('👋 Cliente desconectado del streaming de logs');
    tail.kill();
    res.end();
  });
});

// Función para obtener el estado detallado de OpenVPN
const getOpenVPNStatus = async () => {
  try {
    // Primero intentamos con openvpn@server
    const status = await new Promise((resolve) => {
      exec('systemctl status openvpn@server || systemctl status openvpn', (error, stdout) => {
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
          isActive: activeMatch ? activeMatch[1].includes('active') : false,
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

// Función para procesar el estado y obtener usuarios conectados
const processSyslog = async () => {
  try {
    const status = await getOpenVPNStatus();
    let connectedUsers = new Map();
    let totalTrafico = {
      descargado: 0,
      subido: 0
    };

    try {
      // Leer el archivo de estado de OpenVPN
      const statusContent = await fs.readFile('/etc/openvpn/status.txt', 'utf8');
      const lines = statusContent.split('\n');
      
      let section = '';
      const clientInfo = new Map();
      const routingInfo = new Map();

      // Procesar el archivo línea por línea
      for (const line of lines) {
        if (line.startsWith('OpenVPN CLIENT LIST')) {
          section = 'clients';
          continue;
        } else if (line.startsWith('ROUTING TABLE')) {
          section = 'routing';
          continue;
        } else if (line.startsWith('GLOBAL STATS')) {
          break;
        }

        // Saltar líneas de encabezado
        if (line.startsWith('Updated,') || line.startsWith('Common Name,') || line.startsWith('Virtual Address,')) {
          continue;
        }

        // Procesar información de clientes
        if (section === 'clients' && line.trim()) {
          const [name, realAddress, bytesReceived, bytesSent, connectedSince] = line.split(',');
          if (name && name !== 'Common Name') {
            const bytesRecv = parseInt(bytesReceived) || 0;
            const bytesSnt = parseInt(bytesSent) || 0;
            
            // Acumular tráfico total
            totalTrafico.descargado += bytesRecv;
            totalTrafico.subido += bytesSnt;

            clientInfo.set(name, {
              realAddress,
              bytesReceived: bytesRecv,
              bytesSent: bytesSnt,
              connectedSince
            });
          }
        }

        // Procesar tabla de enrutamiento
        if (section === 'routing' && line.trim()) {
          const [virtualAddress, name, realAddress, lastRef] = line.split(',');
          if (name && name !== 'Common Name') {
            routingInfo.set(name, virtualAddress);
          }
        }
      }

      // Combinar la información de clientes y enrutamiento
      for (const [name, info] of clientInfo) {
        const virtualIP = routingInfo.get(name);
        if (virtualIP) {
          connectedUsers.set(name, {
            nombre: name,
            ip: virtualIP,
            ip_real: info.realAddress.split(':')[0],
            conexion: info.connectedSince,
            recibido: `${(info.bytesReceived / (1024 * 1024)).toFixed(2)} MB`,
            enviado: `${(info.bytesSent / (1024 * 1024)).toFixed(2)} MB`
          });
        }
      }

    } catch (error) {
      console.error('Error leyendo archivo de estado de OpenVPN:', error);
    }

    return {
      usuariosActivos: connectedUsers.size,
      estado: status.isActive ? 'Activo' : 'Inactivo',
      desde: status.since,
      trafico: {
        descargado: `${(totalTrafico.descargado / (1024 * 1024)).toFixed(2)} MB`,
        subido: `${(totalTrafico.subido / (1024 * 1024)).toFixed(2)} MB`
      },
      clientes: Array.from(connectedUsers.values()),
      actualizado: new Date().toLocaleString()
    };
  } catch (error) {
    console.error('Error procesando estado de OpenVPN:', error);
    return {
      usuariosActivos: 0,
      estado: 'Error',
      desde: '',
      trafico: {
        descargado: '0.00 MB',
        subido: '0.00 MB'
      },
      clientes: [],
      actualizado: new Date().toLocaleString()
    };
  }
};

// Endpoint para obtener el estado de OpenVPN
router.get('/status', async (req, res) => {
  try {
    const status = await processSyslog();
    res.json(status);
  } catch (error) {
    console.error('Error al obtener estado de OpenVPN:', error);
    res.status(500).json({
      usuariosActivos: 0,
      estado: 'Error',
      desde: '',
      trafico: {
        descargado: '0.00 MB',
        subido: '0.00 MB'
      },
      clientes: [],
      actualizado: new Date().toLocaleString()
    });
  }
});

// Endpoint para obtener la configuración de OpenVPN
router.get('/config', verifyTokenMiddleware, checkPermission('ver_vpn_config'), async (req, res) => {
  try {
    const configContent = await fs.readFile('/etc/openvpn/server.conf', 'utf-8');
    res.json({ content: configContent });
  } catch (error) {
    console.error('Error al leer la configuración:', error);
    res.status(500).json({ 
      error: 'Error al leer la configuración',
      details: error.message 
    });
  }
});

// Endpoint para guardar la configuración
router.post('/config', verifyTokenMiddleware, checkPermission('editar_vpn_config'), async (req, res) => {
  const { content } = req.body;
  try {
    await fs.writeFile('/etc/openvpn/server.conf', content);
    res.json({ message: 'Configuración guardada exitosamente' });
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    res.status(500).json({ error: 'Error al guardar la configuración' });
  }
});

// Endpoint para cambiar contraseña
router.put('/users/:username/password', verifyTokenMiddleware, checkPermission('editar_vpn_usuarios'), async (req, res) => {
  const { username } = req.params;
  const { password } = req.body;

  try {
    // Verificar si el usuario existe
    const [existingUsers] = await pool.query('SELECT id FROM vpn_users WHERE username = ?', [username]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar la contraseña del usuario
    await execAsync(`echo "${username}:${password}" | sudo chpasswd`);

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar la contraseña:', error);
    res.status(500).json({ error: 'Error al actualizar la contraseña' });
  }
});

export default router; 