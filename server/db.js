import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config(); // Cargar variables de entorno desde .env

export const createPool = () => {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
};

export const pool = createPool();

export default {
  createPool,
  pool
};
