import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import moment from 'moment';
moment.locale('es');

export const generatePDF = async (data) => {
    return new Promise(async (resolve, reject) => {
        console.log("📄 Iniciando generación de PDF con Puppeteer...");

        const fileName = `informe_mantenimiento_${data.cliente || "nw"}_${Date.now()}.pdf`;
        const pdfPath = path.join("informes", fileName);

        if (!fs.existsSync("informes")) {
            console.log("📂 Creando directorio 'informes'...");
            fs.mkdirSync("informes", { recursive: true });
        }
        
     


        try {
            const browser = await puppeteer.launch({ 
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();

            // Configurar viewport para tamaño adecuado
            await page.setViewport({
                width: 1400,
                height: 1600,
                deviceScaleFactor: 1,
            });

            // Cargar el contenido HTML
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            
            // Configurar para impresión
            await page.emulateMediaType('screen');
            
            // Esperar un momento para que se carguen todos los recursos
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Generar el PDF
            await page.pdf({
                path: pdfPath,
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '25mm',
                    right: '20mm',
                    bottom: '25mm',
                    left: '20mm',
                },
                displayHeaderFooter: true,
                headerTemplate: '<div></div>', // Plantilla vacía para el encabezado
                footerTemplate: `
                    <div style="width: 100%; font-size: 10px; text-align: center; color: #777;">
                        <span class="pageNumber"></span> / <span class="totalPages"></span>
                    </div>
                `,
                footerMargin: '10mm',
                preferCSSPageSize: true
            });

            await browser.close();
            console.log("✅ PDF guardado en:", pdfPath);
            resolve(pdfPath);
        } catch (error) {
            console.error("❌ Error al generar PDF con Puppeteer:", error);
            reject(error);
        }

        generatePDF(data, htmlContent)
            .then(pdfPath => console.log(`PDF generado en: ${pdfPath}`))
            .catch(error => console.error("Error al generar PDF:", error));
    });
};