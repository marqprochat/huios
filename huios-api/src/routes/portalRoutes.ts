import { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import {
  getStudentAttendanceSummary, getStudentLesson, getStudentReportCard, listStudentExamQuestions,
  listStudentExams, listStudentLessons, submitStudentExam
} from '../controllers/portalController';
import { authenticateToken } from '../middlewares/auth';
import { StudentNotFoundError } from '../services/studentContext';

const router = Router();
const asyncHandler = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.use(authenticateToken);
router.get('/aulas', asyncHandler(listStudentLessons));
router.get('/aulas/:id', asyncHandler(getStudentLesson));
router.get('/boletim', asyncHandler(getStudentReportCard));
router.get('/presenca/pendencias', asyncHandler(getStudentAttendanceSummary));
router.get('/provas', asyncHandler(listStudentExams));
router.get('/provas/:id/questoes', asyncHandler(listStudentExamQuestions));
router.post('/provas/:id/submit', asyncHandler(submitStudentExam));

router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof StudentNotFoundError) return res.status(404).json({ message: error.message });
  console.error('Portal error:', error);
  return res.status(500).json({ message: 'Erro interno do servidor' });
});

export default router;
