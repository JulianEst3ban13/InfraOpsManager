import { pool } from "../db.js";
import { enviarCorreo } from "../utils/notificaciones.js";

// Crear un mantenimiento y ejecutarlo automáticamente
export const crearMantenimiento = async (req, res) => {
    try {
        console.log("Datos recibidos:", req.body);

        const { titulo, descripcion, fecha, estado, basedatos, usuario_id } = req.body;

        // Separar la fecha y hora
        const [fechaStr, horaStr] = fecha.split(' ');
        
        // Validación: Revisar si algún campo está vacío
        if (!titulo || !descripcion || !fechaStr || !estado || !basedatos || !usuario_id) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        // Insertar en la base de datos con la hora
        const [result] = await pool.execute(
            `INSERT INTO mantenimientos (titulo, descripcion, fecha, hora, estado, basedatos, usuario_id, tamano_antes, tamano_despues) 
             VALUES (?, ?, ?, ?, ?, ?, ?, '', '')`,
            [titulo, descripcion, fechaStr, horaStr || '00:00', estado, basedatos, usuario_id]
        );

        const idMantenimiento = result.insertId;

        // Ejecutar mantenimiento automáticamente
        ejecutarMantenimiento(idMantenimiento, basedatos);

        res.status(201).json({ message: "Mantenimiento creado y en ejecución", id: idMantenimiento });

    } catch (error) {
        console.error("Error al crear mantenimiento:", error);
        res.status(500).json({ error: "Error al crear mantenimiento" });
    }
};

// Función para ejecutar el mantenimiento en la base de datos
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
            // 📌 Notificar administrador
        await enviarCorreo(
            "juliand@gruponw.com",
            "🔔 Mantenimiento Finalizado",
            `El mantenimiento de la base de datos ${dbConfig.basededatos} se ha completado exitosamente.`
        );

        console.log("🎉 Mantenimiento finalizado con éxito.");
    } catch (error) {
        console.error("❌ Error durante el mantenimiento:", error);
        await pool.query(`UPDATE mantenimientos SET estado = 'fallido' WHERE id = ?`, [id]);
        await registrarLog(id, "❌ Mantenimiento fallido.");
    }
};

export const registrarLog = async (id, mensaje) => {
    await pool.query("INSERT INTO mantenimiento_logs (mantenimiento_id, mensaje) VALUES (?, ?)", [id, mensaje]);
  };