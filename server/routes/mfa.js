import express from 'express';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { pool } from '../db.js';

const router = express.Router();

// Endpoint para generar secreto y QR
router.post('/setup', async (req, res) => {
  const { userId, username } = req.body;
  const secret = speakeasy.generateSecret({ name: `Mantenimientos (${username})` });

  // Guarda el secreto en la BD del usuario
  await pool.query('UPDATE users SET mfa_secret = ? WHERE id = ?', [secret.base32, userId]);

  // Genera el QR
  qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
    if (err) return res.status(500).json({ error: 'Error generando QR' });
    res.json({ qr: data_url, secret: secret.base32 });
  });
});

// Endpoint para verificar código MFA
router.post('/verify', async (req, res) => {
  const { userId, token } = req.body;
  const [rows] = await pool.query('SELECT mfa_secret FROM users WHERE id = ?', [userId]);
  const user = rows[0];

  if (!user || !user.mfa_secret) return res.status(400).json({ error: 'MFA no configurado' });

  const verified = speakeasy.totp.verify({
    secret: user.mfa_secret,
    encoding: 'base32',
    token
  });

  if (verified) {
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Código incorrecto' });
  }
});

export default router; 