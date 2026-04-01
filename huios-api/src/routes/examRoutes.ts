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

const router = Router();

// Exam routes
router.get('/', getExams);
router.get('/:id', getExamById);
router.post('/', createExam);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);
router.post('/:id/publish', publishExam);
router.post('/:id/unpublish', unpublishExam);
router.post('/:id/duplicate', duplicateExam);
router.get('/:id/results', getExamResults);

// Question routes (nested under exam)
router.get('/:examId/questions', getQuestionsByExam);
router.post('/:examId/questions', createQuestion);
router.put('/:examId/questions/reorder', reorderQuestions);

// Question routes (by ID)
router.get('/:examId/questions/:id', getQuestionById);
router.put('/:examId/questions/:id', updateQuestion);
router.delete('/:examId/questions/:id', deleteQuestion);

export default router;
