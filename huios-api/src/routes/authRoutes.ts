import { Router } from 'express';
import { getMe, login } from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.post('/login', login);
router.get('/me', authenticateToken, getMe);

export default router;
