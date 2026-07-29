import { Router } from 'express';
import {
  getStudentGrades,
  getDisciplineGrades,
  createGrade,
  updateGrade,
  deleteGrade,
  getReportCard
} from '../controllers/gradeController';
import { authenticateToken } from '../middlewares/auth';
import { requireApiPermission } from '../auth/permissions';

const router = Router();

// Report card (boletim)
router.get('/report-card/:studentId', authenticateToken, requireApiPermission('boletins.visualizar'), getReportCard);

// Student grades
router.get('/student/:studentId', authenticateToken, requireApiPermission('notas.visualizar'), getStudentGrades);

// Discipline grades
router.get('/discipline/:disciplineId', authenticateToken, requireApiPermission('notas.visualizar'), getDisciplineGrades);

// Grade CRUD
router.post('/', authenticateToken, requireApiPermission('notas.lancar'), createGrade);
router.put('/:id', authenticateToken, requireApiPermission('notas.editar'), updateGrade);
router.delete('/:id', authenticateToken, requireApiPermission('notas.editar'), deleteGrade);

export default router;
