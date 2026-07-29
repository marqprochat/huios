import { Router } from 'express';
import { getClasses } from '../controllers/classController';
import { authenticateToken } from '../middlewares/auth';
import { requireApiPermission } from '../auth/permissions';

const router = Router();

router.get('/', authenticateToken, requireApiPermission('turmas.visualizar'), getClasses);

export default router;
