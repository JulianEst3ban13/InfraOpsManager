import { exec } from "child_process";
import { writeFile, unlink, mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

// 📌 Función para crear archivo .pgpass temporal
const crearPgPass = async (dbConfig) => {
    const pgpassPath = join(homedir(), '.pgpass');
    const pgpassContent = `${dbConfig.ip}:${dbConfig.puerto}:${dbConfig.basededatos}:${dbConfig.usuario}:${dbConfig.contraseña}`;
    
    try {
        await writeFile(pgpassPath, pgpassContent, { mode: 0o600 });
        return pgpassPath;
    } catch (error) {
        console.error('Error al crear archivo .pgpass:', error);
        throw error;
    }
};

// 📌 Función para eliminar archivo .pgpass temporal
const limpiarPgPass = async (pgpassPath) => {
    try {
        await unlink(pgpassPath);
    } catch (error) {
        console.error('Error al eliminar archivo .pgpass:', error);
    }
};

// 📌 Función genérica para ejecutar comandos de shell
const ejecutarComando = (comando, descripcion) => {
    return new Promise((resolve, reject) => {
        console.log(`🔹 Ejecutando: ${descripcion}`);
        exec(comando, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error en ${descripcion}:`, stderr);
                reject(error);
            } else {
                console.log(`✅ ${descripcion} completado.`);
                resolve(stdout.trim() || stderr.trim());
            }
        });
    });
};

// 📌 Captura el tamaño de la BD en MB
export const capturarTamañoBD = async (dbConfig) => {
    let comandoSize = "";
    let pgpassPath = null;

    try {
        if (dbConfig.tipo_bd === "mysql") {
            comandoSize = `mysql -h ${dbConfig.ip} -P ${dbConfig.puerto} -u ${dbConfig.usuario} -p'${dbConfig.contraseña}' -D ${dbConfig.basededatos} -N -e "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) FROM information_schema.tables WHERE table_schema = '${dbConfig.basededatos}'"`;
        } else if (dbConfig.tipo_bd === "pgsql") {
            pgpassPath = await crearPgPass(dbConfig);
            comandoSize = `psql -h ${dbConfig.ip} -p ${dbConfig.puerto} -U ${dbConfig.usuario} -d ${dbConfig.basededatos} -t -c "SELECT pg_database_size('${dbConfig.basededatos}') / 1024 / 1024"`;
        }

        const resultado = await ejecutarComando(comandoSize, "Capturar tamaño de la base de datos");
        return resultado;
    } finally {
        if (pgpassPath) {
            await limpiarPgPass(pgpassPath);
        }
    }
};

// 📌 Exportar y comprimir la tabla nw_registro antes del TRUNCATE
export const exportarTablaRegistro = async (dbConfig) => {
    const backupDir = "/var/www/mantenimiento/backup_db";
    await mkdir(backupDir, { recursive: true });
    const fecha = new Date().toISOString().replace(/[:]/g, "-").split(".")[0];
    const archivo = join(backupDir, `${dbConfig.basededatos}_nw_registro_${fecha}.sql.gz`);
    let comando = "";

    if (dbConfig.tipo_bd === "mysql") {
        comando = `mysqldump -h ${dbConfig.ip} -P ${dbConfig.puerto} -u ${dbConfig.usuario} -p'${dbConfig.contraseña}' ${dbConfig.basededatos} nw_registro | gzip > ${archivo}`;
    } else if (dbConfig.tipo_bd === "pgsql") {
        comando = `PGPASSWORD='${dbConfig.contraseña}' pg_dump -h ${dbConfig.ip} -p ${dbConfig.puerto} -U ${dbConfig.usuario} -d ${dbConfig.basededatos} -t nw_registro | gzip > ${archivo}`;
    } else {
        throw new Error("Tipo de base de datos no soportado para exportar tabla nw_registro");
    }

    await ejecutarComando(comando, `Exportar y comprimir nw_registro a ${archivo}`);
    return archivo;
};

// 📌 Ejecuta `TRUNCATE` en la BD seleccionada
export const ejecutarTruncate = async (dbConfig) => {
    let pgpassPath = null;

    try {
        // Exportar la tabla nw_registro antes de truncar (para MySQL y PostgreSQL)
        if (dbConfig.tipo_bd === "mysql" || dbConfig.tipo_bd === "pgsql") {
            await exportarTablaRegistro(dbConfig);
        }

        const tablas_mysql = [
            "nw_cambios_claves", "nw_chat_private", "nw_control_acceso", "nw_downloads",
            "nw_excel_list", "nw_fail_access", "nw_forgot_password", "nw_notes",
            "nw_read_user", "nw_registro", "usuarios_log"
        ];

        const tablas_pgsql = [
            "nw_registro", "nw_read_user", "nw_excel_list", "nw_control_acceso", "nw_chat",
            "nw_chat_private", "nw_cambios_claves", "nw_forgot_password", "nw_notes",
            "nw_notifications", "nw_downloads", "nw_fail_access", "usuarios_log"
        ];

        if (dbConfig.tipo_bd === "mysql") {
            for (const tabla of tablas_mysql) {
                const verificarTabla = `mysql -h ${dbConfig.ip} -P ${dbConfig.puerto} -u ${dbConfig.usuario} --password='${dbConfig.contraseña}' -D ${dbConfig.basededatos} -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${dbConfig.basededatos}' AND table_name = '${tabla}';"`;

                try {
                    const resultado = await ejecutarComando(verificarTabla, `Verificar existencia de ${tabla}`);
                    
                    if (resultado.trim() === "0") {
                        console.warn(`⚠️ La tabla ${tabla} no existe en ${dbConfig.basededatos}. Se omitirá el TRUNCATE.`);
                        continue;
                    }

                    const comando = `mysql -h ${dbConfig.ip} -P ${dbConfig.puerto} -u ${dbConfig.usuario} --password='${dbConfig.contraseña}' -D ${dbConfig.basededatos} -e "TRUNCATE TABLE ${tabla};"`;
                    await ejecutarComando(comando, `Truncar tabla ${tabla}`);
                } catch (error) {
                    console.warn(`⚠️ Error al verificar o truncar ${tabla}. Se omite.`);
                }
            }
        } else if (dbConfig.tipo_bd === "pgsql") {
            pgpassPath = await crearPgPass(dbConfig);
            const comando = `psql -h ${dbConfig.ip} -p ${dbConfig.puerto} -U ${dbConfig.usuario} -d ${dbConfig.basededatos} -c "TRUNCATE ${tablas_pgsql.join(", ")} RESTART IDENTITY CASCADE;"`;
            await ejecutarComando(comando, "Ejecutar TRUNCATE en PostgreSQL");
        } else {
            console.error("❌ Tipo de base de datos no soportado para TRUNCATE.");
            return;
        }

        console.log("✅ TRUNCATE ejecutado correctamente.");
    } finally {
        if (pgpassPath) {
            await limpiarPgPass(pgpassPath);
        }
    }
};

// 📌 Optimiza la base de datos seleccionada
export const optimizarBD = async (dbConfig) => {
    let pgpassPath = null;

    try {
        if (dbConfig.tipo_bd === "mysql") {
            const obtenerTablas = `mysql -h ${dbConfig.ip} -P ${dbConfig.puerto} -u ${dbConfig.usuario} --password='${dbConfig.contraseña}' -D ${dbConfig.basededatos} -N -e "SHOW TABLES;"`;

            try {
                const resultado = await ejecutarComando(obtenerTablas, "Obtener lista de tablas para optimización");
                const tablas = resultado.split("\n").filter((t) => t.trim() !== "");

                if (tablas.length === 0) {
                    console.warn(`⚠️ No hay tablas para optimizar en la base de datos ${dbConfig.basededatos}.`);
                    return;
                }

                for (const tabla of tablas) {
                    const comando = `mysqlcheck -h ${dbConfig.ip} -P ${dbConfig.puerto} -u ${dbConfig.usuario} --password='${dbConfig.contraseña}' --optimize ${dbConfig.basededatos} ${tabla}`;
                    await ejecutarComando(comando, `Optimizar tabla ${tabla}`);
                }

                console.log(`✅ Optimización completada en la base de datos ${dbConfig.basededatos}.`);
            } catch (error) {
                console.error("❌ Error al obtener o optimizar las tablas:", error);
            }
        } else if (dbConfig.tipo_bd === "pgsql") {
            pgpassPath = await crearPgPass(dbConfig);
            const comando = `psql -h ${dbConfig.ip} -p ${dbConfig.puerto} -U ${dbConfig.usuario} -d ${dbConfig.basededatos} -c "VACUUM ANALYZE;"`;
            await ejecutarComando(comando, "Optimizar la base de datos en PostgreSQL");
        } else {
            console.error("❌ Tipo de base de datos no soportado para optimización.");
            return;
        }
    } finally {
        if (pgpassPath) {
            await limpiarPgPass(pgpassPath);
        }
    }
};

// 📌 Realiza el backup de la base de datos
export const ejecutarBackup = async (dbConfig) => {
    let pgpassPath = null;

    try {
        const fecha = new Date().toISOString().replace(/[:]/g, "-").split(".")[0];
        const archivoBackup = `"${dbConfig.basededatos}-${fecha}.sql"`;
        let comandoBackup = "";

        if (dbConfig.tipo_bd === "mysql") {
            comandoBackup = `mysqldump -h ${dbConfig.ip} -P ${dbConfig.puerto} -u ${dbConfig.usuario} -p'${dbConfig.contraseña}' ${dbConfig.basededatos} > ${archivoBackup}`;
        } else if (dbConfig.tipo_bd === "pgsql") {
            pgpassPath = await crearPgPass(dbConfig);
            comandoBackup = `pg_dump -h ${dbConfig.ip} -p ${dbConfig.puerto} -U ${dbConfig.usuario} -F c -b -v -f ${archivoBackup} ${dbConfig.basededatos}`;
        }

        return await ejecutarComando(comandoBackup, "Ejecutar backup");
    } finally {
        if (pgpassPath) {
            await limpiarPgPass(pgpassPath);
        }
    }
};

export const registrarLog = async (id, mensaje) => {
  await pool.query("INSERT INTO mantenimiento_logs (mantenimiento_id, mensaje) VALUES (?, ?)", [id, mensaje]);
};