import express from 'express';
import awsController from '../controllers/awsController.js';
import * as awsPinnedTotalsController from '../controllers/awsPinnedTotalsController.js';
const router = express.Router();

// Presupuestos mensuales
router.post('/budget', awsController.createOrUpdateBudget);
router.get('/budget', awsController.getBudget);
router.put('/budget', awsController.updateBudget);
router.delete('/budget', awsController.deleteBudget);

// Costos diarios
router.post('/cost', awsController.createDailyCost);
router.get('/cost', awsController.getDailyCosts);
router.put('/cost/:id', awsController.updateDailyCost);
router.delete('/cost/:id', awsController.deleteDailyCost);

// Obtener todos los costos históricos para gráfico mensual
router.get('/historical-costs', awsController.getAllHistoricalCosts);

// Nueva ruta para enviar resumen de costos AWS por correo
router.post('/send-cost-summary', awsController.sendCostSummaryEmail);

// Nueva ruta para enviar resumen de costos AWS por correo para múltiples meses
router.post('/send-multi-month-cost-summary', awsController.sendMultiMonthCostSummaryEmail);

// Pinear gasto mensual acumulado
router.post('/pin-total', awsPinnedTotalsController.pinMonthlyTotal);
// Obtener totales pineados
router.get('/pinned-totals', awsPinnedTotalsController.getPinnedTotals);
// Obtener totales pineados para gráfico mensual
router.get('/pinned-totals-chart', awsPinnedTotalsController.getPinnedTotalsForChart);
// Obtener totales pineados para un rango específico
router.get('/pinned-totals-range', awsPinnedTotalsController.getPinnedTotalsForRange);

export default router; 