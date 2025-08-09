import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const API_URL = process.env.API_URL;
const BEARER_TOKEN = process.env.BEARER_TOKEN;

router.post('/chat', async (req, res) => {
  try {
    console.log('Recibida solicitud en /api/ai/chat con cuerpo:', JSON.stringify(req.body, null, 2));

    const payload = req.body;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BEARER_TOKEN}`
    };

    console.log('Enviando solicitud a API externa con headers:', headers);

    const { data } = await axios.post(API_URL, payload, { headers });

    console.log('Respuesta recibida de API externa:', JSON.stringify(data, null, 2));

    res.json({
      success: true,
      response: data
    });
  } catch (error) {
    console.error('Error en /api/ai/chat. Detalles completos del error:');

    if (error.response) {
      console.error('Datos de respuesta del error:', error.response.data);
      console.error('Estado HTTP del error:', error.response.status);
      console.error('Cabeceras de respuesta del error:', error.response.headers);
    } else if (error.request) {
      console.error('No se recibió respuesta. Detalles de la solicitud:', error.request);
    } else {
      console.error('Error al configurar la solicitud:', error.message);
    }

    console.error('Configuración completa de la solicitud:', error.config);

    res.status(500).json({
      success: false,
      error: error.response?.data || 'Error interno del servidor',
      message: error.message
    });
  }
});

export default router;