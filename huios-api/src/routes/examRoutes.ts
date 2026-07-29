import { Router } from 'express';
import {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  publishExam,
  unpublishExam,
  duplicateExam,
  getExamResults
} from '../controllers/examController';
import {
  getQuestionsByExam,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions
} from '../controllers/questionController';
import { authenticateToken } from '../middlewares/auth';
import { requireApiPermission } from '../auth/permissions';

const router = Router();

// Exam routes
router.get('/', authenticateToken, requireApiPermission('provas.visualizar'), getExams);
router.get('/:id', authenticateToken, requireApiPermission('provas.visualizar'), getExamById);
router.post('/', authenticateToken, requireApiPermission('provas.criar'), createExam);
router.put('/:id', authenticateToken, requireApiPermission('provas.editar'), updateExam);
router.delete('/:id', authenticateToken, requireApiPermission('provas.excluir'), deleteExam);
router.post('/:id/publish', authenticateToken, requireApiPermission('provas.aplicar'), publishExam);
router.post('/:id/unpublish', authenticateToken, requireApiPermission('provas.aplicar'), unpublishExam);
router.post('/:id/duplicate', authenticateToken, requireApiPermission('provas.criar'), duplicateExam);
router.get('/:id/results', authenticateToken, requireApiPermission('provas.visualizar'), getExamResults);

// Question routes (nested under exam)
router.get('/:examId/questions', authenticateToken, requireApiPermission('provas.visualizar'), getQuestionsByExam);
router.post('/:examId/questions', authenticateToken, requireApiPermission('provas.editar'), createQuestion);
router.put('/:examId/questions/reorder', authenticateToken, requireApiPermission('provas.editar'), reorderQuestions);

// Question routes (by ID)
router.get('/:examId/questions/:id', authenticateToken, requireApiPermission('provas.visualizar'), getQuestionById);
router.put('/:examId/questions/:id', authenticateToken, requireApiPermission('provas.editar'), updateQuestion);
router.delete('/:examId/questions/:id', authenticateToken, requireApiPermission('provas.editar'), deleteQuestion);

export default router;
