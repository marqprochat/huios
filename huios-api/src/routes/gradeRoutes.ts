import { Router } from 'express';
import {
  getStudentGrades,
  getDisciplineGrades,
  createGrade,
  updateGrade,
  deleteGrade,
  getReportCard
} from '../controllers/gradeController';

const router = Router();

// Report card (boletim)
router.get('/report-card/:studentId', getReportCard);

// Student grades
router.get('/student/:studentId', getStudentGrades);

// Discipline grades
router.get('/discipline/:disciplineId', getDisciplineGrades);

// Grade CRUD
router.post('/', createGrade);
router.put('/:id', updateGrade);
router.delete('/:id', deleteGrade);

export default router;
