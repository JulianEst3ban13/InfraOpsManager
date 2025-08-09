import express from "express";
import { generatePDF } from "../services/pdfGenerator.js";
import { pool } from "../db.js";
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';
import { fileURLToPath } from 'url';
import { DateTime } from "luxon";
import { sendEmail } from "../services/emailService.js";
import { verifyTokenMiddleware } from "../utils/authMiddleware.js";
import { checkPermission } from "../utils/permissionMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helpers de Handlebars
handlebars.registerHelper('subtract', (a, b) => (parseFloat(a) - parseFloat(b)).toFixed(2));
handlebars.registerHelper('percentage', (initial, final) => (((parseFloat(initial) - parseFloat(final)) / parseFloat(initial)) * 100).toFixed(1));

function formatearFecha(fechaStr) {
  try {
    console.log('Fecha recibida:', fechaStr);
    const fecha = DateTime.fromISO(fechaStr);
    
    if (!fecha.isValid) {
      console.error('Fecha inválida:', fechaStr);
      const ahora = DateTime.now();
      return {
        fecha: ahora.toFormat('dd/MM/yyyy'),
        hora: ahora.toFormat('HH:mm')
      };
    }

    return {
      fecha: fecha.toFormat('dd/MM/yyyy'),
      hora: fecha.toFormat('HH:mm')
    };
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    const ahora = DateTime.now();
    return {
      fecha: ahora.toFormat('dd/MM/yyyy'),
      hora: ahora.toFormat('HH:mm')
    };
  }
}

router.post('/generate-report', verifyTokenMiddleware, checkPermission('crear_mantenimiento'), async (req, res) => {
    const startTime = Date.now();
    console.log("🚀 Iniciando generación de reporte...");
    console.log("Body recibido:", req.body);

    try {
        const data = req.body;
        const mantenimiento = data.mantenimientos?.[0];
        
        if (!mantenimiento) {
            throw new Error('No se recibieron datos del mantenimiento');
        }

        console.log('Datos de mantenimiento recibidos:', mantenimiento);

        // Validar campos requeridos
        if (!mantenimiento.fecha && !mantenimiento.created_at) {
            throw new Error('Se requiere fecha o created_at');
        }

        // Formatear fechas para VACUUM y ANALYZE
        const fechaVacuumObj = formatearFecha(mantenimiento.fecha || mantenimiento.created_at);
        const fechaAnalyzeObj = formatearFecha(mantenimiento.fecha || mantenimiento.created_at);

        console.log('Fecha VACUUM formateada:', fechaVacuumObj);
        console.log('Fecha ANALYZE formateada:', fechaAnalyzeObj);

        // Crear contenido del template
        const templateContent = {
            cliente: data.cliente,
            basededatos: mantenimiento.basededatos,
            tamano_antes: mantenimiento.tamano_antes,
            tamano_despues: mantenimiento.tamano_despues,
            fecha: fechaVacuumObj.fecha,
            hora: fechaVacuumObj.hora,
            created_at: fechaAnalyzeObj.fecha,
            hora2: fechaAnalyzeObj.hora,
            autor: data.autor,
            week: data.week,
            year: data.year,
            initialSize: data.initialSize,
            finalSize: data.finalSize,
            email: data.emails?.[0]
        };

        // Leer la plantilla HTML
        console.log('📄 Buscando plantilla HTML...');
        
        // Lista de posibles ubicaciones de la plantilla
        const possiblePaths = [
            path.join(__dirname, '../templates/report-template.html'),
            path.join(__dirname, '../templates/report.html'),
            '/var/www/mantenimiento/server/templates/report-template.html',
            process.env.REPORT_TEMPLATE_PATH // Para configuración personalizada
        ].filter(Boolean);
        
        console.log('📂 Posibles ubicaciones:', possiblePaths);
        
        let foundPath = null;
        let templateHtml = null;
        
        // Intentar leer la plantilla de cada ubicación
        for (const templatePath of possiblePaths) {
            try {
                console.log(`🔍 Buscando en: ${templatePath}`);
                templateHtml = await fs.readFile(templatePath, 'utf-8');
                foundPath = templatePath;
                console.log(`✅ Plantilla encontrada en: ${templatePath}`);
                break;
            } catch (err) {
                if (err.code === 'ENOENT') {
                    console.log(`❌ No encontrada en: ${templatePath}`);
                } else {
                    console.error(`❌ Error al leer: ${templatePath}`, err);
                }
            }
        }
        
        if (!templateHtml) {
            throw new Error('No se pudo encontrar la plantilla HTML en ninguna ubicación');
        }
        
        // Compilar la plantilla con Handlebars
        console.log('🔧 Compilando plantilla desde:', foundPath);
        
        // Extraer datos de mantenimiento
        console.log('📊 Datos de mantenimiento:', mantenimiento);
        
        // Calcular porcentaje de reducción
        const tamanoAntes = parseFloat(mantenimiento.tamano_antes || 0);
        const tamanoDespues = parseFloat(mantenimiento.tamano_despues || 0);
        const porcentajeReduccion = tamanoAntes > 0 
            ? ((tamanoAntes - tamanoDespues) / tamanoAntes * 100).toFixed(2) 
            : "0";
        
        console.log(`📊 Tamaño antes: ${tamanoAntes}, Tamaño después: ${tamanoDespues}, Reducción: ${porcentajeReduccion}%`);
        
        // Semana y año
        const now = DateTime.now();
        
        // Fechas y horas de los procesos
        console.log('⏰ Fechas y horas de los procesos:');
        console.log(`- VACUUM: Fecha=${fechaVacuumObj.fecha}, Hora=${fechaVacuumObj.hora}`);
        console.log(`- ANALYZE: Fecha=${fechaAnalyzeObj.fecha}, Hora=${fechaAnalyzeObj.hora}`);
        
        const template = handlebars.compile(templateHtml);
        const htmlContent = template({
            // Datos básicos
            cliente: data.cliente,
            basededatos: mantenimiento.basededatos,
            fecha: fechaVacuumObj.fecha,
            hora: fechaVacuumObj.hora,
            created_at: fechaAnalyzeObj.fecha,
            hora2: fechaAnalyzeObj.hora,
            autor: data.autor,
            
            // Datos de tamaño y reducción
            tamano_antes: mantenimiento.tamano_antes || 0,
            tamano_despues: mantenimiento.tamano_despues || 0,
            porcentaje_reduccion: porcentajeReduccion,
            
            // Datos de tiempo
            semana: data.week || now.weekNumber,
            anio: data.year || now.year,
            
            // Datos específicos para los procesos
            proceso_vacuum: {
                fecha: fechaVacuumObj.fecha,
                hora: fechaVacuumObj.hora,
                ejecutado_por: "Sistema automático",
                estado: "Completado exitosamente"
            },
            proceso_analyze: {
                fecha: fechaAnalyzeObj.fecha,
                hora: fechaAnalyzeObj.hora,
                ejecutado_por: "Sistema automático",
                estado: "Completado exitosamente"
            },
            
            // Descripción y estado
            descripcion: mantenimiento.descripcion || "",
            estado: mantenimiento.estado || "Completado",
            
            // Asegurar que todas las variables usadas en la plantilla estén definidas
            ...mantenimiento
        });

        // Generar PDF
        console.log('📑 Generando PDF...');
        const pdfResult = await generatePDF(htmlContent);
        const pdfBuffer = pdfResult.buffer;
        const pdfPath = pdfResult.filePath;
        const pdfFileName = pdfResult.fileName;
        
        console.log('✅ PDF generado en:', pdfPath);

        // Guardar en la base de datos (inserción directa y segura)
        console.log('💾 Guardando en la base de datos...');
        let reportId = null;
        try {
            const query = `
                INSERT INTO reports (cliente, fecha_envio, emails, ruta_pdf, basededatos)
                VALUES (?, NOW(), ?, ?, ?)
            `;
            const values = [
                data.cliente || 'Sin cliente',
                data.emails?.[0] || '',
                pdfPath,
                mantenimiento.basededatos || 'default'
            ];
            const [result] = await pool.query(query, values);
            reportId = result.insertId;
            console.log('✅ Reporte guardado con ID:', reportId);
        } catch (error) {
            console.error('❌ Error al guardar el reporte:', error);
            throw error;
        }

        // Enviar correo si se especifican destinatarios
        if (data.emails && data.emails.length > 0) {
            console.log('📧 Enviando correo a:', data.emails.join(', '));
            try {
                await sendEmail({
                    to: data.emails.join(','),
                    subject: `Informe de Mantenimiento - ${templateContent.cliente}`,
                    html: htmlContent,
                    attachments: [{
                        filename: pdfFileName,
                        path: pdfPath,
                        contentType: 'application/pdf'
                    }]
                });
                console.log('✅ Correo enviado con éxito.');
                
                // Actualizar estado en la base de datos
                if (reportId) {
                    await pool.query('UPDATE reports SET status = ? WHERE id = ?', ['Enviado', reportId]);
                }
            } catch (emailError) {
                console.error('❌ Error al enviar correo:', emailError);
                if (reportId) {
                    await pool.query('UPDATE reports SET status = ? WHERE id = ?', ['Error de envío', reportId]);
                }
            }
        } else {
            console.log('📧 No se especificaron correos, omitiendo envío.');
        }

        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`✅ Reporte generado y procesado en ${duration}ms`);

        res.json({ 
            message: 'Reporte generado y guardado exitosamente', 
            reportId: reportId,
            filePath: pdfPath 
        });

    } catch (error) {
        console.error('❌ Error general:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar el reporte',
            error: error.message
        });
    }
});

// Endpoint para obtener todos los informes
router.get('/', verifyTokenMiddleware, checkPermission('ver_informes'), async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM reports ORDER BY id DESC");
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener informes:", error);
    res.status(500).json({ error: "Error al obtener informes" });
  }
});

// Endpoint para descargar un informe
router.get('/download/:id', verifyTokenMiddleware, checkPermission('descargar_informe'), async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query("SELECT ruta_pdf FROM reports WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Informe no encontrado' });
    }

    const filePath = rows[0].ruta_pdf;
    res.download(filePath);
  } catch (error) {
    console.error("Error al descargar informe:", error);
    res.status(500).json({ error: 'Error al descargar el informe' });
  }
});

// Endpoint para eliminar un informe
router.delete('/:id', verifyTokenMiddleware, checkPermission('eliminar_informe'), async (req, res) => {
  const { id } = req.params;
  try {
    // Opcional: eliminar el archivo PDF del servidor
    const [rows] = await pool.query("SELECT ruta_pdf FROM reports WHERE id = ?", [id]);
    if (rows.length > 0) {
      const filePath = rows[0].ruta_pdf;
      if (filePath) {
        await fs.unlink(filePath).catch(err => console.error("No se pudo eliminar el archivo:", err));
      }
    }
    
    await pool.query("DELETE FROM reports WHERE id = ?", [id]);
    res.json({ message: 'Informe eliminado correctamente' });
  } catch (error) {
    console.error("Error al eliminar informe:", error);
    res.status(500).json({ error: 'Error al eliminar el informe' });
  }
});

export default router;