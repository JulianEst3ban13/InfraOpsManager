import Queue from "bull";
import dotenv from "dotenv";
import { ejecutarMantenimiento } from "../utils/mantenimientoUtils.js"; // Nueva función que haremos

dotenv.config();

// Cola de mantenimientos en Bull
export const mantenimientoQueue = new Queue("mantenimientoQueue", {
  redis: { host: process.env.REDIS_HOST || "127.0.0.1", port: process.env.REDIS_PORT || 6379 },
});

// Procesar trabajos de mantenimiento
mantenimientoQueue.process(async (job) => {
  const { job_id, basededatos, tipo_bd } = job.data;
  console.log(`🛠 Ejecutando mantenimiento en ${basededatos} (Job ID: ${job_id})`);

  try {
    await ejecutarMantenimiento(basededatos, tipo_bd);
    console.log(`✅ Mantenimiento completadosssss: ${basededatos}`);
  } catch (error) {
    console.error(`❌ Error en mantenimiento de ${basededatos}:`, error);
  }
});
