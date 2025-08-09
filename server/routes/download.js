import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Endpoint para descargar PDFs
router.get('/download-pdf', async (req, res) => {
  try {
    const filePath = req.query.path;

    // Validación básica de seguridad: verificar que estamos en la carpeta /var/www/mantenimiento/informes
    if (!filePath || !filePath.startsWith('/var/www/mantenimiento/informes/')) {
      return res.status(403).json({ error: 'Ruta no autorizada' });
    }

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      console.error(`Archivo no encontrado: ${filePath}`);
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Obtener estadísticas del archivo
    const stat = fs.statSync(filePath);
    
    // Obtener el nombre del archivo para el encabezado Content-Disposition
    const fileName = path.basename(filePath);

    // Configurar headers para descarga
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${fileName}`);

    // Enviar archivo
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error al descargar PDF:', error);
    res.status(500).json({ error: 'Error al descargar el archivo' });
  }
});

export default router;
