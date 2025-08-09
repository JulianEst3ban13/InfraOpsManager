import express from "express";
import { pool } from "../db.js"; // ✅ Importa correctamente la conexión a la BD

const router = express.Router();

// 🚀 **Ruta para registrar mantenimientos**
router.post("/", async (req, res) => {
    const { titulo, descripcion, fecha, basededatos, usuario_id } = req.body;

    try {
        const [result] = await pool.query(`
            INSERT INTO mantenimientos (titulo, descripcion, fecha, estado, basededatos, usuario_id, tamano_antes, tamano_despues) 
            VALUES (?, ?, ?, 'en_proceso', ?, ?, '', '')`,
            [titulo, descripcion, fecha, basededatos, usuario_id]
        );

        res.status(201).json({ message: "Mantenimiento registrado con éxito", id: result.insertId });
    } catch (error) {
        console.error("❌ Error al registrar mantenimiento:", error);
        res.status(500).json({ message: "Error al registrar mantenimiento" });
    }
});

export default router; // ✅ Exportar correctamente el router
