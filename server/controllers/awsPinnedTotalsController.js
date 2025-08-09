import { pool } from '../db.js';

// Guardar o actualizar el total pineado
export const pinMonthlyTotal = async (req, res) => {
  const { year, month, total, user_id } = req.body;
  
  try {
    // Ajustar el mes para la base de datos (frontend: 0-11, DB: 1-12)
    const dbMonth = Number(month) + 1;
    
    console.log('🔍 Guardando total pineado:', {
      year,
      month: `${dbMonth} (original: ${month})`,
      total,
      user_id
    });

    await pool.query(
      `INSERT INTO aws_monthly_pinned_totals (year, month, total, user_id)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         total = VALUES(total), 
         pinned_at = CURRENT_TIMESTAMP, 
         user_id = VALUES(user_id)`,
      [year, dbMonth, total, user_id]
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Obtener totales pineados
export const getPinnedTotals = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM aws_monthly_pinned_totals ORDER BY year DESC, month DESC');
    
    // Corregir el acceso a los datos - result[0] contiene las filas
    const rows = result[0] || [];
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Obtener totales pineados para gráfico mensual
export const getPinnedTotalsForChart = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM aws_monthly_pinned_totals ORDER BY year ASC, month ASC');
    
    // Corregir el acceso a los datos - result[0] contiene las filas
    const rows = result[0] || [];
    
    // Convertir a formato esperado por el gráfico (ajustando los meses de 1-12 a 0-11)
    const chartData = rows.map(row => ({
      name: `${row.year}-${row.month - 1}`,
      total: Number(row.total)
    }));

    console.log('📊 Datos del gráfico mensual:', chartData);
    
    res.json(chartData);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Obtener totales pineados para un rango de meses específico
export const getPinnedTotalsForRange = async (req, res) => {
  const { startYear, startMonth, endYear, endMonth } = req.query;

  try {
    // Convertir parámetros a números y ajustar los meses (frontend: 0-11, DB: 1-12)
    const startYearNum = Number(startYear);
    const startMonthNum = Number(startMonth) + 1; // Ajustar mes de inicio
    const endYearNum = Number(endYear);
    const endMonthNum = Number(endMonth) + 1; // Ajustar mes de fin

    console.log('🔍 Meses ajustados:', {
      startMonth: `${startMonthNum} (original: ${startMonth})`,
      endMonth: `${endMonthNum} (original: ${endMonth})`
    });

    // Ajustar la consulta SQL para manejar correctamente el rango
    const result = await pool.query(
      `SELECT * FROM aws_monthly_pinned_totals 
       WHERE ((year = ? AND month >= ?) OR (year > ?))
       AND ((year = ? AND month <= ?) OR (year < ?))
       ORDER BY year ASC, month ASC`,
      [startYearNum, startMonthNum, startYearNum, endYearNum, endMonthNum, endYearNum]
    );
    const rows = result[0] || [];

    // Convertir a formato para el gráfico (ajustando los meses de vuelta a 0-11)
    const chartData = rows.map(row => ({
      name: `${row.year}-${row.month - 1}`, // Ajustar mes para el frontend
      total: Number(row.total)
    }));

    // Log para depuración
    console.log('🔍 Rango solicitado:', { startYear: startYearNum, startMonth: startMonthNum, endYear: endYearNum, endMonth: endMonthNum });
    console.log('📊 Datos encontrados:', chartData);

    res.json(chartData);
  } catch (err) {
    console.error('🔴 Error en getPinnedTotalsForRange:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
