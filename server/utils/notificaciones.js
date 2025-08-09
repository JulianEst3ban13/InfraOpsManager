import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, 
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false 
    }
});

// 📌 Función mejorada para enviar correos
export const enviarCorreo = async (destinatario, asunto, mensaje) => {
    try {
        console.log('🚀 Iniciando envío de correo...');
        console.log('📧 Configuración SMTP:', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_USER,
            secure: false
        });

        if (!destinatario || !asunto || !mensaje) {
            console.error("❌ Error: Datos incompletos al enviar correo.");
            console.error('📋 Datos recibidos:', { destinatario, asunto, mensaje: mensaje ? 'presente' : 'ausente' });
            return;
        }

        console.log('📨 Preparando envío a:', destinatario);
        console.log('📑 Asunto:', asunto);

        const info = await transporter.sendMail({
            from: `"Soporte Mantenimiento" <infraestructura@gruponw.com>`, 
            to: destinatario, 
            subject: asunto,
            text: mensaje,
            html: `
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .header {
                            background-color: #f8f9fa;
                            padding: 20px;
                            border-radius: 8px;
                            margin-bottom: 20px;
                        }
                        .header h2 {
                            color: #2196F3;
                            margin: 0;
                        }
                        .content {
                            background-color: white;
                            padding: 20px;
                            border-radius: 8px;
                            border: 1px solid #e0e0e0;
                        }
                        .info-section {
                            margin-bottom: 20px;
                        }
                        .info-label {
                            font-weight: bold;
                            color: #666;
                        }
                        .instancias-list {
                            list-style: none;
                            padding: 0;
                            margin: 10px 0;
                        }
                        .instancia-item {
                            padding: 5px 0;
                        }
                        .footer {
                            margin-top: 20px;
                            padding-top: 20px;
                            border-top: 1px solid #e0e0e0;
                            font-size: 12px;
                            color: #666;
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>🔔 Nueva Revisión de Backup Registrada</h2>
                    </div>
                    <div class="content">
                        ${mensaje}
                    </div>
                    <div class="footer">
                        <p>Este es un mensaje automático, por favor no responda.</p>
                        <p>© ${new Date().getFullYear()} Grupo NW - Soporte de Mantenimiento</p>
                    </div>
                </body>
                </html>
            `,
        });

        console.log(`✅ Correo enviado exitosamente`);
        console.log('📬 Detalles del envío:', {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected
        });
    } catch (error) {
        console.error("❌ Error al enviar correo:", error);
        console.error("📍 Stack trace:", error.stack);
        console.error("🔍 Detalles adicionales:", {
            errorCode: error.code,
            errorMessage: error.message,
            smtpResponse: error.response
        });
        throw error;
    }
};

export const enviarCorreoAdjunto = async (destinatarios, asunto, mensaje, rutaArchivo) => {
    try {
        if (!destinatarios || !asunto || !mensaje || !rutaArchivo) {
            console.error("❌ Error: Datos incompletos al enviar correo con adjunto.");
            return;
        }

        const info = await transporter.sendMail({
            from: `"Soporte Mantenimiento" <infraestructura@gruponw.com>`, 
            to: destinatarios,  // 📌 Corregido: usa el parámetro correcto
            subject: asunto,
            text: mensaje,
            html: `
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2 style="color: #333;">🔔 Notificación de Mantenimiento</h2>
                    <p style="font-size: 16px;">${mensaje}</p>
                    <hr>
                    <p style="font-size: 12px; color: #888;">Este es un mensaje automático, por favor no responda.</p>
                </body>
                </html>
            `,
            attachments: [
                {
                    filename: rutaArchivo.split("/").pop(),  // 📌 Corregido
                    path: rutaArchivo,  // 📌 Corregido
                },
            ],
        });

        console.log(`📧 Correo con adjunto enviado a ${destinatarios}: ${info.messageId}`);
    } catch (error) {
        console.error("❌ Error al enviar correo con adjunto:", error);
    }
};

// 📌 Función específica para notificaciones de revisiones de backup AWS
export const enviarCorreoRevisionBackup = async (destinatario, fecha, observaciones, instanciasRevisadas) => {
    try {
        console.log('🚀 Iniciando envío de correo de revisión de backup AWS...');
        
        if (!destinatario || !fecha || !instanciasRevisadas) {
            console.error("❌ Error: Datos incompletos para la notificación de revisión de backup.");
            return;
        }

        const mensaje = `
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background-color: #232F3E;
                        padding: 20px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                    }
                    .header h2 {
                        color: #FF9900;
                        margin: 0;
                    }
                    .content {
                        background-color: white;
                        padding: 20px;
                        border-radius: 8px;
                        border: 1px solid #e0e0e0;
                    }
                    .info-section {
                        margin-bottom: 20px;
                        padding: 15px;
                        background-color: #f8f9fa;
                        border-radius: 6px;
                    }
                    .info-label {
                        font-weight: bold;
                        color: #232F3E;
                        margin-bottom: 8px;
                    }
                    .instancias-list {
                        list-style: none;
                        padding: 0;
                        margin: 10px 0;
                    }
                    .instancia-item {
                        padding: 8px 0;
                        border-bottom: 1px solid #eee;
                    }
                    .instancia-item:last-child {
                        border-bottom: none;
                    }
                    .check-icon {
                        color: #4CAF50;
                        margin-right: 8px;
                    }
                    .footer {
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid #e0e0e0;
                        font-size: 12px;
                        color: #666;
                        text-align: center;
                    }
                    .aws-logo {
                        color: #FF9900;
                        font-weight: bold;
                        font-size: 1.2em;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>📦 Revisión de Backup AWS</h2>
                </div>
                <div class="content">
                    <div class="info-section">
                        <p class="info-label">📅 Fecha de Revisión:</p>
                        <p>${new Date(fecha).toLocaleString()}</p>
                    </div>
                    
                    <div class="info-section">
                        <p class="info-label">📝 Observaciones:</p>
                        <p>${observaciones || 'Sin observaciones'}</p>
                    </div>
                    
                    <div class="info-section">
                        <p class="info-label">✅ Instancias AWS Revisadas:</p>
                        <ul class="instancias-list">
                            ${instanciasRevisadas.map(inst => `
                                <li class="instancia-item">
                                    <span class="check-icon">✓</span> ${inst}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                <div class="footer">
                    <p>Este es un mensaje automático del sistema de revisión de backups.</p>
                    <p>© ${new Date().getFullYear()} Grupo NW - Soporte de Infraestructura</p>
                </div>
            </body>
            </html>
        `;

        const info = await transporter.sendMail({
            from: `"Soporte AWS" <infraestructura@gruponw.com>`,
            to: destinatario,
            subject: "📦 Revisión de Backup AWS Completada",
            html: mensaje
        });

        console.log('✅ Correo de revisión de backup enviado exitosamente');
        console.log('📬 Detalles del envío:', {
            messageId: info.messageId,
            response: info.response
        });
    } catch (error) {
        console.error("❌ Error al enviar correo de revisión de backup:", error);
        throw error;
    }
};

