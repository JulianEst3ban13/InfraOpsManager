import express from 'express';
import { executeQuery, getDatabaseStructure, getTableDetails, updateTableComment, updateColumn } from '../controllers/queryController.js';
import { verifyTokenMiddleware } from '../utils/authMiddleware.js';
import { checkPermission } from '../utils/permissionMiddleware.js';

const router = express.Router();

router.post('/execute-query', verifyTokenMiddleware, checkPermission('ejecutar_query'), executeQuery);
router.get('/database/:connectionId/structure', verifyTokenMiddleware, checkPermission('ver_estructura_bd'), getDatabaseStructure);
router.post('/get-table-details', verifyTokenMiddleware, checkPermission('ver_estructura_bd'), getTableDetails);
router.post('/update-table-comment', verifyTokenMiddleware, checkPermission('modificar_estructura_bd'), updateTableComment);
router.post('/update-column', verifyTokenMiddleware, checkPermission('modificar_estructura_bd'), updateColumn);

export default router; 