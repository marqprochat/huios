import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { registerToken, removeToken } from '../controllers/pushTokenController';

const router = Router();

router.post('/', authenticateToken, registerToken);
router.delete('/:token', authenticateToken, removeToken);

export default router;
