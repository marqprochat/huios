import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { authenticateToken } from '../middlewares/auth';
import { requireApiPermission } from '../auth/permissions';

const router = Router();

// GET /api/settings - Get system settings
router.get('/', authenticateToken, requireApiPermission('configuracoes.visualizar'), getSettings);

// PUT /api/settings - Update system settings
router.put('/', authenticateToken, requireApiPermission('configuracoes.editar'), updateSettings);

export default router;
