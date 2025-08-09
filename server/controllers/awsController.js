import { pool } from "../db.js";
import nodemailer from 'nodemailer';
import fs from 'fs';

// Crear o actualizar presupuesto mensual
async function createOrUpdateBudget(req, res) {
  const { year, month, value } = req.body;
  console.log('🟢 [createOrUpdateBudget] Datos recibidos:', { year, month, value });
  if (!year || month === undefined || !value) {
    return res.status(400).json({ message: 'Faltan datos requeridos' });
  }
  try {
    await pool.query(
      `INSERT INTO aws_budgets (year, month, value) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [year, month, value]
    );
    res.json({ message: 'Presupuesto guardado correctamente' });
  } catch (err) {
    console.error('🔴 [createOrUpdateBudget] Error SQL:', err);
    res.status(500).json({ message: 'Error al guardar presupuesto', error: err.sqlMessage || err.message });
  }
}

// Obtener presupuesto mensual por año y mes
async function getBudget(req, res) {
  const { year, month } = req.query;
  console.log('🟢 [getBudget] Params:', { year, month });
  if (!year || month === undefined) {
    return res.status(400).json({ message: 'Faltan parámetros year y month' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT * FROM aws_budgets WHERE year = ? AND month = ?',
      [year, month]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error('🔴 [getBudget] Error SQL:', err);
    res.status(500).json({ message: 'Error al obtener presupuesto', error: err.sqlMessage || err.message });
  }
}

// Actualizar presupuesto mensual
async function updateBudget(req, res) {
  const { year, month, value } = req.body;
  if (!year || month === undefined || !value) {
    return res.status(400).json({ message: 'Faltan datos requeridos' });
  }
  try {
    await pool.query(
      'UPDATE aws_budgets SET value = ? WHERE year = ? AND month = ?',
      [value, year, month]
    );
    res.json({ message: 'Presupuesto actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar presupuesto', error: err });
  }
}

// Eliminar presupuesto mensual
async function deleteBudget(req, res) {
  const { year, month } = req.query;
  if (!year || month === undefined) {
    return res.status(400).json({ message: 'Faltan parámetros year y month' });
  }
  try {
    await pool.query('DELETE FROM aws_budgets WHERE year = ? AND month = ?', [year, month]);
    res.json({ message: 'Presupuesto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar presupuesto', error: err });
  }
}

// Crear costo diario
async function createDailyCost(req, res) {
  const { year, month, day, week, value } = req.body;
  
  console.log('🟢 [createDailyCost] Datos recibidos:', { year, month, day, week, value });
  
  if (!year || month === undefined || !day || !week || !value) {
    console.log('🔴 [createDailyCost] Error: Faltan datos requeridos');
    return res.status(400).json({ 
      success: false,
      message: 'Faltan datos requeridos',
      error: 'MISSING_REQUIRED_FIELDS'
    });
  }
  
  try {
    // Verificar si ya existe un costo para este día específico
    const [existingRows] = await pool.query(
      'SELECT * FROM aws_daily_costs WHERE year = ? AND month = ? AND day = ?',
      [year, month, day]
    );
    
    if (existingRows.length > 0) {
      const existingCost = existingRows[0];
      console.log('🔴 [createDailyCost] Error: Ya existe un costo para este día:', {
        fecha: `${existingCost.day}/${existingCost.month}/${existingCost.year}`,
        valorExistente: existingCost.value
      });
      
      return res.status(409).json({ 
        success: false,
        message: `Ya existe un costo para el día ${day} de ${month + 1}/${year}`,
        error: 'DUPLICATE_DAY_COST',
        existingCost: {
          id: existingCost.id,
          year: existingCost.year,
          month: existingCost.month,
          day: existingCost.day,
          week: existingCost.week,
          value: existingCost.value
        },
        suggestedDay: day + 1 // Sugerir el siguiente día
      });
    }
    
    // Proceder con la inserción
    const [insertResult] = await pool.query(
      'INSERT INTO aws_daily_costs (year, month, day, week, value) VALUES (?, ?, ?, ?, ?)',
      [year, month, day, week, value]
    );
    
    console.log('✅ [createDailyCost] Costo creado exitosamente:', {
      id: insertResult.insertId,
      fecha: `${day}/${month + 1}/${year}`,
      valor: value
    });
    
    res.json({ 
      success: true,
      message: 'Costo diario guardado correctamente',
      createdCost: {
        id: insertResult.insertId,
        year,
        month,
        day,
        week,
        value
      }
    });
  } catch (err) {
    console.error('🔴 [createDailyCost] Error SQL:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error al guardar costo diario',
      error: err.sqlMessage || err.message,
      details: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
}

// Obtener costos diarios por año y mes
async function getDailyCosts(req, res) {
  const { year, month } = req.query;
  if (!year || month === undefined) {
    return res.status(400).json({ message: 'Faltan parámetros year y month' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT * FROM aws_daily_costs WHERE year = ? AND month = ? ORDER BY day ASC',
      [year, month]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener costos diarios', error: err });
  }
}

// Actualizar costo diario
async function updateDailyCost(req, res) {
  const { id } = req.params;
  const { value } = req.body;
  if (!id || value === undefined) {
    return res.status(400).json({ message: 'Faltan datos requeridos' });
  }
  try {
    await pool.query('UPDATE aws_daily_costs SET value = ? WHERE id = ?', [value, id]);
    res.json({ message: 'Costo diario actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar costo diario', error: err });
  }
}

// Eliminar costo diario
async function deleteDailyCost(req, res) {
  const { id } = req.params;
  
  console.log('🟢 [deleteDailyCost] Iniciando eliminación del costo con ID:', id);
  
  if (!id) {
    console.log('🔴 [deleteDailyCost] Error: Falta el parámetro id');
    return res.status(400).json({ 
      success: false,
      message: 'Falta el parámetro id',
      error: 'ID_REQUIRED'
    });
  }
  
  try {
    // Primero verificar si el registro existe y obtener sus datos
    const [existingRows] = await pool.query(
      'SELECT * FROM aws_daily_costs WHERE id = ?',
      [id]
    );
    
    if (existingRows.length === 0) {
      console.log('🔴 [deleteDailyCost] Error: No se encontró el costo con ID:', id);
      return res.status(404).json({ 
        success: false,
        message: 'No se encontró el costo diario especificado',
        error: 'COST_NOT_FOUND'
      });
    }
    
    const costoToDelete = existingRows[0];
    console.log('📊 [deleteDailyCost] Costo encontrado:', {
      id: costoToDelete.id,
      fecha: `${costoToDelete.day}/${costoToDelete.month}/${costoToDelete.year}`,
      valor: costoToDelete.value
    });
    
    // Proceder con la eliminación
    const [deleteResult] = await pool.query(
      'DELETE FROM aws_daily_costs WHERE id = ?',
      [id]
    );
    
    if (deleteResult.affectedRows === 0) {
      console.log('🔴 [deleteDailyCost] Error: No se pudo eliminar el registro');
      return res.status(500).json({ 
        success: false,
        message: 'No se pudo eliminar el costo diario',
        error: 'DELETE_FAILED'
      });
    }
    
    console.log('✅ [deleteDailyCost] Costo eliminado exitosamente');
    
    // Devolver información detallada del costo eliminado
    res.json({ 
      success: true,
      message: 'Costo diario eliminado correctamente',
      deletedCost: {
        id: costoToDelete.id,
        year: costoToDelete.year,
        month: costoToDelete.month,
        day: costoToDelete.day,
        week: costoToDelete.week,
        value: costoToDelete.value
      }
    });
    
  } catch (err) {
    console.error('🔴 [deleteDailyCost] Error SQL:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error al eliminar costo diario',
      error: err.sqlMessage || err.message,
      details: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
}

// Obtener todos los costos históricos para el gráfico mensual
async function getAllHistoricalCosts(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT year, month, SUM(value) as total 
       FROM aws_daily_costs 
       GROUP BY year, month 
       ORDER BY year ASC, month ASC`
    );
    
    // Convertir a formato esperado por el frontend
    const monthlyTotals = rows.map(row => ({
      name: `${row.year}-${row.month}`,
      total: Number(row.total)
    }));
    
    res.json(monthlyTotals);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener costos históricos', error: err.message });
  }
}

// Enviar resumen de costos AWS por correo
export const sendCostSummaryEmail = async (req, res) => {
  try {
    const { emails, year, month, presupuesto, gasto, avance, chartImage } = req.body;
    
    console.log('🟢 [sendCostSummaryEmail] Iniciando envío de correo');
    console.log('📧 Emails:', emails);
    console.log('📊 Datos:', { year, month, presupuesto, gasto, avance });
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un destinatario.' });
    }
    
    // Validar que el chartImage esté presente y sea válido
    if (!chartImage || typeof chartImage !== 'string') {
      console.error('🔴 [sendCostSummaryEmail] chartImage inválido:', typeof chartImage);
      return res.status(400).json({ error: 'La imagen del gráfico es requerida.' });
    }
    
    // Obtener los costos diarios para información adicional
    let costosFiltrados = [];
    try {
      const [rows] = await pool.query(
        'SELECT * FROM aws_daily_costs WHERE year = ? AND month = ? ORDER BY day ASC',
        [year, month]
      );
      costosFiltrados = rows;
      console.log('📊 [sendCostSummaryEmail] Costos obtenidos:', costosFiltrados.length, 'registros');
    } catch (costErr) {
      console.error('⚠️ [sendCostSummaryEmail] Error obteniendo costos:', costErr);
      costosFiltrados = [];
    }
    
    // Depuración detallada del base64
    console.log('🟢 [sendCostSummaryEmail] chartImage recibido:');
    console.log('  - Tipo:', typeof chartImage);
    console.log('  - Longitud:', chartImage.length);
    console.log('  - Inicio:', chartImage.substring(0, 50));
    console.log('  - Final:', chartImage.slice(-50));
    console.log('  - Es base64 válido:', chartImage.startsWith('data:image/png;base64,'));
    
    // Configurar el transporter con variables de entorno
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    // Armar el HTML del correo
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const mesNombre = meses[month] || month;
    const asunto = `Resumen de Costos AWS - ${mesNombre} ${year}`;
    
    // Crear el HTML del correo con diseño moderno y profesional
    let html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <!-- Header -->
        <div style="background: #25282e; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Logo NW -->
          <div style="margin-bottom: 15px;">
            <div style="display: inline-block; background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
              <img src="data:image/png;base64,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" alt="NW Group Logo" style="width: 120px; height: auto; display: block;" />
            </div>
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Resumen de Costos AWS</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 16px;">${mesNombre} ${year}</p>
        </div>

        <!-- Main Content Card -->
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
          
          <!-- Resumen de Costos Section -->
          <div style="margin-bottom: 25px;">
            <h2 style="margin: 0 0 15px 0; color: #1a202c; font-size: 18px; font-weight: 600; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">Resumen de Costos</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="font-weight: 600; color: #4a5568;">Presupuesto mensual:</span>
                <span style="font-weight: 700; color: #2d3748; font-size: 16px;">$${Number(presupuesto).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="font-weight: 600; color: #4a5568;">Gasto acumulado:</span>
                <span style="font-weight: 700; color: ${Number(gasto) > Number(presupuesto) ? '#e53e3e' : '#38a169'}; font-size: 16px;">$${Number(gasto).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600; color: #4a5568;">% Avance:</span>
                <div style="display: flex; align-items: center;">
                  <span style="font-weight: 700; color: ${Number(avance) > 100 ? '#e53e3e' : '#38a169'}; font-size: 16px; margin-right: 8px;">${Number(avance).toFixed(2)}%</span>
                  <div style="width: 60px; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${Math.min(Number(avance), 100)}%; height: 100%; background: ${Number(avance) > 100 ? '#e53e3e' : '#38a169'}; border-radius: 4px;"></div>
                  </div>
                </div>
              </div>
              ${Number(gasto) > Number(presupuesto) ? `
                <div style="margin-top: 12px; padding: 8px 12px; background: #fed7d7; border: 1px solid #feb2b2; border-radius: 6px; text-align: center;">
                  <span style="color: #c53030; font-weight: 600; font-size: 14px;">⚠️ Presupuesto excedido</span>
                </div>
              ` : ''}
            </div>
          </div>
    `;
    
    // Agregar la imagen solo si es válida
    if (chartImage && chartImage.startsWith('data:image/png;base64,')) {
      html += `
          <!-- Gráfico Section -->
          <div style="margin-bottom: 25px;">
            <h2 style="margin: 0 0 15px 0; color: #1a202c; font-size: 18px; font-weight: 600; border-bottom: 2px solid #38a169; padding-bottom: 8px;">Gráfico de Costos Diarios</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #38a169; text-align: center;">
              <img src="${chartImage}" alt="Gráfico de costos diarios AWS" style="display: block; max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;" />
            </div>
          </div>
      `;
      
      // Guardar imagen de debug
      try {
        const base64Data = chartImage.replace(/^data:image\/png;base64,/, '');
        const debugPath = '/var/www/mantenimiento/tmp/aws_chart_debug.png';
        fs.mkdirSync('/var/www/mantenimiento/tmp', { recursive: true });
        fs.writeFileSync(debugPath, base64Data, 'base64');
        console.log('✅ [sendCostSummaryEmail] Imagen guardada en:', debugPath);
      } catch (debugErr) {
        console.error('⚠️ [sendCostSummaryEmail] Error guardando debug:', debugErr);
      }
    } else {
      html += `
          <!-- Error Section -->
          <div style="margin-bottom: 25px;">
            <h2 style="margin: 0 0 15px 0; color: #1a202c; font-size: 18px; font-weight: 600; border-bottom: 2px solid #e53e3e; padding-bottom: 8px;">Error en Gráfico</h2>
            <div style="background: #fed7d7; padding: 20px; border-radius: 8px; border-left: 4px solid #e53e3e; text-align: center;">
              <span style="color: #c53030; font-weight: 600;">No se pudo generar la imagen del gráfico</span>
            </div>
          </div>
      `;
      console.error('🔴 [sendCostSummaryEmail] chartImage no es válido para incluir en el correo');
    }
    
    html += `
          <!-- Detalles Adicionales Section -->
          <div style="margin-bottom: 25px;">
            <h2 style="margin: 0 0 15px 0; color: #1a202c; font-size: 18px; font-weight: 600; border-bottom: 2px solid #ed8936; padding-bottom: 8px;">Información Adicional</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #ed8936;">
              <div style="margin-bottom: 12px;">
                <span style="font-weight: 600; color: #4a5568;">Período analizado:</span>
                <span style="color: #2d3748; margin-left: 8px;">${mesNombre} ${year}</span>
              </div>
              <div style="margin-bottom: 12px;">
                <span style="font-weight: 600; color: #4a5568;">Días con datos:</span>
                <span style="color: #2d3748; margin-left: 8px;">${costosFiltrados ? costosFiltrados.length : 0} días</span>
              </div>
              <div>
                <span style="font-weight: 600; color: #4a5568;">Promedio diario:</span>
                <span style="color: #2d3748; margin-left: 8px;">$${costosFiltrados && costosFiltrados.length > 0 ? (Number(gasto) / costosFiltrados.length).toFixed(2) : '0.00'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #718096; font-size: 14px; line-height: 1.5;">
          <p style="margin: 0 0 8px 0;">Este es un mensaje automático del sistema de gestión de costos AWS.</p>
          <p style="margin: 0; font-weight: 600;">© 2025 Grupo NW - Soporte de Infraestructura</p>
        </div>
      </div>
    `;
    
    console.log('📧 [sendCostSummaryEmail] Enviando correo a:', emails.join(', '));
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: emails.join(','),
      subject: asunto,
      html
    });
    
    console.log('✅ [sendCostSummaryEmail] Correo enviado exitosamente');
    res.json({ success: true, message: 'Correo enviado correctamente.' });
  } catch (err) {
    console.error('🔴 [sendCostSummaryEmail] Error al enviar correo:', err);
    res.status(500).json({ error: 'Error al enviar el correo: ' + err.message });
  }
};

// Función para obtener datos de costos y presupuestos de un periodo
async function getCostDataForPeriod(startYear, startMonth, endYear, endMonth) {
  // Ajustar los meses para la base de datos (frontend: 0-11, DB: 1-12)
  const dbStartMonth = Number(startMonth) + 1;
  const dbEndMonth = Number(endMonth) + 1;

  console.log('🟢 [getCostDataForPeriod] Obteniendo datos para periodo:', {
    startYear,
    startMonth: `${dbStartMonth} (original: ${startMonth})`,
    endYear,
    endMonth: `${dbEndMonth} (original: ${endMonth})`
  });
  
  try {
    // Obtener costos diarios para el periodo
    const [costRows] = await pool.query(
      `SELECT * FROM aws_daily_costs 
       WHERE (year > ? OR (year = ? AND month >= ?)) 
       AND (year < ? OR (year = ? AND month <= ?)) 
       ORDER BY year ASC, month ASC`,
      [startYear, startYear, dbStartMonth, endYear, endYear, dbEndMonth]
    );
    
    // Obtener presupuestos para el periodo (ajustando los meses)
    const [budgetRows] = await pool.query(
      `SELECT * FROM aws_budgets 
       WHERE (year > ? OR (year = ? AND month >= ?)) 
       AND (year < ? OR (year = ? AND month <= ?)) 
       ORDER BY year ASC, month ASC`,
      [startYear, startYear, dbStartMonth, endYear, endYear, dbEndMonth]
    );
    
    // Organizar datos por mes
    const monthlyData = {};
    
    // Procesar presupuestos (ajustando los meses de vuelta a 0-11)
    budgetRows.forEach(budget => {
      const adjustedMonth = budget.month - 1; // Ajustar mes para el frontend
      const key = `${budget.year}-${adjustedMonth}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { 
          year: budget.year, 
          month: adjustedMonth, 
          budget: budget.value, 
          costs: [], 
          totalCost: 0 
        };
      } else {
        monthlyData[key].budget = budget.value;
      }
    });
    
    // Procesar costos y depurar suma mensual (ajustando los meses de vuelta a 0-11)
    costRows.forEach(cost => {
      const adjustedMonth = cost.month - 1; // Ajustar mes para el frontend
      const key = `${cost.year}-${adjustedMonth}`;
      if (!monthlyData[key]) {
        monthlyData[key] = {
          year: cost.year,
          month: adjustedMonth,
          budget: 0,
          costs: [],
          totalCost: 0
        };
      }
      monthlyData[key].costs.push(cost);
      monthlyData[key].totalCost += Number(cost.value) || 0;
    });
    // Log de depuración por mes
    Object.values(monthlyData).forEach(m => {
      console.log(`🟡 Mes: ${m.year}-${m.month}`);
      console.log('  Días:', m.costs.map(c => c.day));
      console.log('  Valores:', m.costs.map(c => c.value));
      console.log('  totalCost SUMADO:', m.totalCost);
    });
    
    // Convertir a array y ordenar
    const result = Object.values(monthlyData).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
    
    // Calcular diferencias entre meses
    for (let i = 1; i < result.length; i++) {
      const current = result[i];
      const previous = result[i - 1];
      current.costDifference = current.totalCost - previous.totalCost;
      current.costDifferencePercentage = previous.totalCost !== 0 ? 
        ((current.costDifference / previous.totalCost) * 100) : 0;
    }
    
    console.log('✅ [getCostDataForPeriod] Datos obtenidos:', result.length, 'meses');
    return result;
  } catch (err) {
    console.error('🔴 [getCostDataForPeriod] Error:', err);
    throw err;
  }
}

// Enviar resumen de costos AWS por correo para múltiples meses
export const sendMultiMonthCostSummaryEmail = async (req, res) => {
  try {
    const { 
      emails, 
      startYear, 
      startMonth, 
      endYear, 
      endMonth,
      chartImage 
    } = req.body;
    
    // Ajustar los meses para la base de datos (frontend: 0-11, DB: 1-12)
    const dbStartMonth = Number(startMonth) + 1;
    const dbEndMonth = Number(endMonth) + 1;
    
    console.log('🟢 [sendMultiMonthCostSummaryEmail] Iniciando envío de correo');
    console.log('📧 Emails:', emails);
    console.log('📊 Periodo:', { 
      startYear, 
      startMonth: `${dbStartMonth} (original: ${startMonth})`,
      endYear, 
      endMonth: `${dbEndMonth} (original: ${endMonth})`
    });
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un destinatario.' });
    }
    
    // Obtener datos para el periodo (usando los meses originales)
    const monthlyData = await getCostDataForPeriod(startYear, startMonth, endYear, endMonth);
    
    if (monthlyData.length === 0) {
      return res.status(400).json({ error: 'No hay datos para el periodo seleccionado.' });
    }
    
    // Configurar el transporter con variables de entorno
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    // Armar el HTML del correo
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    
    const startMonthName = meses[startMonth] || startMonth;
    const endMonthName = meses[endMonth] || endMonth;
    const asunto = `Resumen de Costos AWS - ${startMonthName} ${startYear} a ${endMonthName} ${endYear}`;
    
    // Crear el HTML del correo con diseño moderno y profesional
    let html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; background-color: #f8f9fa;">
        <!-- Header -->
        <div style="background: #25282e; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Resumen de Costos AWS</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Período: ${startMonthName} ${startYear} a ${endMonthName} ${endYear}</p>
        </div>
        
        <!-- Contenido Principal -->
        <div style="padding: 30px;">
          <!-- Resumen por Meses -->
          <div style="margin-bottom: 30px;">
            <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 20px; font-weight: 600; border-bottom: 2px solid #4299e1; padding-bottom: 10px;">Resumen por Meses</h2>
            
            ${monthlyData.map((monthData, index) => {
              const monthName = meses[monthData.month] || monthData.month;
              const budget = parseFloat(monthData.budget) || 0;
              const totalCost = parseFloat(monthData.totalCost) || 0;
              
              const remaining = budget - totalCost;
              const isOverBudget = remaining < 0;
              
              // Calcular diferencia con el mes anterior
              let costDiff = 0;
              let costDiffPercent = 0;
              let diffText = '';
              let diffColor = '';
              
              if (index > 0) {
                const prevMonth = monthlyData[index - 1];
                if (prevMonth) {
                  costDiff = totalCost - prevMonth.totalCost;
                  costDiffPercent = prevMonth.totalCost !== 0 ? (costDiff / prevMonth.totalCost) * 100 : 0;
                  diffText = costDiff >= 0 ? 
                    `+${costDiff.toFixed(2)} (${costDiffPercent.toFixed(1)}%)` : 
                    `${costDiff.toFixed(2)} (${costDiffPercent.toFixed(1)}%)`;
                  diffColor = costDiff >= 0 ? '#e53e3e' : '#38a169';
                }
              }
              
              return `
              <div style="margin-bottom: 25px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; overflow: hidden;">
                <div style="padding: 20px; background: #f7fafc; border-bottom: 1px solid #e2e8f0;">
                  <h3 style="margin: 0; color: #2d3748; font-size: 18px; font-weight: 600;">${monthName} ${monthData.year}</h3>
                </div>
                
                <div style="padding: 20px;">
                  <!-- Presupuesto y Gasto -->
<div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
  <div>
    <span style="font-weight: 600; color: #4a5568;">Presupuesto mensual:</span>
    <span style="color: #2d3748; margin-left: 8px;">$${budget.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
  </div>
  <div>
    <span style="font-weight: 600; color: #4a5568;">Gasto acumulado:</span>
    <span style="color: #2d3748; margin-left: 8px;">$${totalCost.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
  </div>
</div>

<!-- Progreso -->
<div style="margin-bottom: 15px;">
  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
    <span style="font-weight: 600; color: #4a5568;">% Avance:</span>
    <span style="color: #2d3748;">${budget > 0 ? ((totalCost / budget) * 100).toFixed(2) : '0.00'}%</span>
  </div>
  <div style="height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
    <div style="height: 100%; width: ${budget > 0 ? Math.min((totalCost / budget) * 100, 100) : 0}%; background: ${(budget > 0 && (totalCost / budget) * 100 > 100) ? '#e53e3e' : '#4299e1'}; border-radius: 5px;"></div>
  </div>
</div>

<!-- Ahorro/Exceso -->
${isOverBudget ? `
  <div style="margin-bottom: 15px; padding: 12px; border-radius: 8px; background: #fed7d7; border-left: 4px solid #e53e3e;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 600; color: #c53030;">¡Excedido!</span>
      <span style="font-weight: 600; color: #c53030;">Exceso: $${Math.abs(remaining).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
    </div>
  </div>
` : `
  <div style="margin-bottom: 15px; padding: 12px; border-radius: 8px; background: #c6f6d5; border-left: 4px solid #38a169;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 600; color: #2f855a;">Ahorro:</span>
      <span style="font-weight: 600; color: #2f855a;">$${(remaining).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
    </div>
  </div>
`}

                  
                  <!-- Diferencia con mes anterior -->
                  ${index > 0 && typeof prevMonth !== 'undefined' ? `
                  <div style="padding: 12px; border-radius: 8px; background: #ebf8ff; border-left: 4px solid #4299e1;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-weight: 600; color: #2c5282;">Diferencia con ${meses[prevMonth.month] || prevMonth.month}:</span>
                      <span style="font-weight: 600; color: ${diffColor};">${diffText}</span>
                    </div>
                  </div>
                  ` : ''}
                </div>
              </div>
              `;
            }).join('')}
          </div>
          
          <!-- Gráfico -->
          ${chartImage ? `
          <div style="margin-bottom: 30px;">
            <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 20px; font-weight: 600; border-bottom: 2px solid #38a169; padding-bottom: 10px;">Gráfico de Costos</h2>
            <div style="background: #f7fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
              <img src="${chartImage}" alt="Gráfico de costos diarios AWS" style="display: block; max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
            </div>
          </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #718096; font-size: 14px; line-height: 1.5; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 8px 0;">Este es un mensaje automático del sistema de gestión de costos AWS.</p>
          <p style="margin: 0; font-weight: 600;">© 2025 Grupo NW - Soporte de Infraestructura</p>
        </div>
      </div>
    `;
    
    console.log('📧 [sendMultiMonthCostSummaryEmail] Enviando correo a:', emails.join(', '));
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: emails.join(','),
      subject: asunto,
      html
    });
    
    console.log('✅ [sendMultiMonthCostSummaryEmail] Correo enviado exitosamente');
    res.json({ success: true, message: 'Correo enviado correctamente.' });
  } catch (err) {
    console.error('🔴 [sendMultiMonthCostSummaryEmail] Error al enviar correo:', err);
    res.status(500).json({ error: 'Error al enviar el correo: ' + err.message });
  }
};

export default {
  createOrUpdateBudget,
  getBudget,
  updateBudget,
  deleteBudget,
  createDailyCost,
  getDailyCosts,
  updateDailyCost,
  deleteDailyCost,
  getAllHistoricalCosts,
  sendCostSummaryEmail,
  getCostDataForPeriod,
  sendMultiMonthCostSummaryEmail
};
