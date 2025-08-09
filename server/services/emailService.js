import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export const sendEmail = async ({ to, subject, text, html, attachments }) => {
    console.log('📧 Preparando envío de correo...');
    console.log('- Destinatario:', to);
    console.log('- Asunto:', subject);
    
    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            text,
            html,
            attachments
        };

        console.log('📤 Enviando correo...');
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Correo enviado exitosamente:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Error al enviar correo:', error);
        throw error;
    }
}; 