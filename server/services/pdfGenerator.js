import { chromium } from 'playwright';
import os from 'os';
import { promises as fs } from 'fs';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

export const generatePDF = async (html, options = {}) => {
  console.log('💻 Información del sistema:');
  console.log(`- Plataforma: ${os.platform()}`);
  console.log(`- Arquitectura: ${os.arch()}`);
  console.log(`- CPUs: ${os.cpus().length}`);
  console.log(`- Memoria total: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`);
  console.log(`- Memoria libre: ${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`);

  console.log('📄 Iniciando generación de PDF con Playwright...');

  // Crear directorio de informes si no existe
  const informesDir = '/var/www/mantenimiento/informes';
  if (!existsSync(informesDir)) {
    try {
      console.log(`📂 Creando directorio ${informesDir}...`);
      mkdirSync(informesDir, { recursive: true });
    } catch (err) {
      console.warn(`⚠️ No se pudo crear el directorio ${informesDir}:`, err.message);
    }
  }

  // Generar un nombre de archivo único
  const timestamp = Date.now();
  const filename = `informe_${timestamp}.pdf`;
  const pdfPath = path.join(informesDir, filename);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Para un correcto renderizado de estilos locales y fuentes, es mejor establecer el contenido
  // y luego generar el PDF. El 'waitUntil' asegura que todo se cargue.
  await page.setContent(html, { waitUntil: 'networkidle' });
  
  // Configurar opciones para Playwright
  const defaultOptions = {
    path: pdfPath,
    format: 'Letter',
    margin: {
      top: '10mm',
      right: '10mm',
      bottom: '10mm',
      left: '10mm',
    },
    printBackground: true, // ¡Importante para que se vean los fondos y colores!
    ...options
  };

  console.log('⚙️ Configurando opciones de PDF para Playwright');

  try {
    console.log('🔄 Convirtiendo HTML a PDF...');
    
    // Generamos el PDF directamente en la ruta especificada
    await page.pdf(defaultOptions);
    
    console.log('✅ PDF generado exitosamente en:', pdfPath);
    
    // Leer el archivo PDF generado para devolver el buffer
    const pdfBuffer = await fs.readFile(pdfPath);
    
    await browser.close();

    return {
      buffer: pdfBuffer,
      filePath: pdfPath,
      fileName: filename
    };
  } catch (error) {
    console.error('❌ Error al generar PDF con Playwright:', error);
    await browser.close();
    throw error; // Lanzamos el error para que sea manejado por quien llama a la función
  }
};
