import { Router } from 'express';
import { getClasses } from '../controllers/classController';

const router = Router();

router.get('/', getClasses);

export default router;