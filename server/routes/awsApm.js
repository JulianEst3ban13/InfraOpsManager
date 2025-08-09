import { Router } from 'express';
import { ingestMetrics, getMetrics, getServers, getMetricTypes, getServersStatus } from '../controllers/awsApmController.js';

const router = Router();

// Ingesta de métricas desde Telegraf
router.post('/metrics/ingest', ingestMetrics);

// Consulta de métricas
router.get('/metrics', getMetrics);

// Listado de servidores
router.get('/servers', getServers);

// Estado de servidores con información detallada
router.get('/servers/status', getServersStatus);

// Listado de tipos de métricas
router.get('/metric-types', getMetricTypes);

export default router; 