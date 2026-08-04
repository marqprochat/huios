import { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import {
  checkInStudentLesson, checkOutStudentLesson, getStudentAttendanceSummary, getStudentLesson,
  getStudentReportCard, getStudentExamTeacherEvaluation, listStudentExamQuestions, listStudentExams, listStudentLessons,
  submitStudentExam, submitStudentExamTeacherEvaluation, submitStudentJustification
} from '../controllers/portalController';
import { authenticateToken } from '../middlewares/auth';
import { StudentNotFoundError } from '../services/studentContext';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const asyncHandler = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
const allowedJustificationTypes = new Set([
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'text/plain'
]);
const justificationUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      const directory = path.join(process.cwd(), 'uploads', 'justifications');
      fs.mkdirSync(directory, { recursive: true });
      callback(null, directory);
    },
    filename: (_req, file, callback) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedJustificationTypes.has(file.mimetype)) return callback(new Error('Formato de arquivo inválido'));
    return callback(null, true);
  }
});

router.use(authenticateToken);
router.get('/aulas', asyncHandler(listStudentLessons));
router.get('/aulas/:id', asyncHandler(getStudentLesson));
router.post('/aulas/:id/checkin', asyncHandler(checkInStudentLesson));
router.post('/aulas/:id/checkout', asyncHandler(checkOutStudentLesson));
router.get('/boletim', asyncHandler(getStudentReportCard));
router.get('/presenca/pendencias', asyncHandler(getStudentAttendanceSummary));
router.get('/provas', asyncHandler(listStudentExams));
router.get('/provas/:id/avaliacao-professor', asyncHandler(getStudentExamTeacherEvaluation));
router.post('/provas/:id/avaliacao-professor', asyncHandler(submitStudentExamTeacherEvaluation));
router.get('/provas/:id/questoes', asyncHandler(listStudentExamQuestions));
router.post('/provas/:id/submit', asyncHandler(submitStudentExam));
router.post('/presenca/justificativa', justificationUpload.single('file'), asyncHandler(submitStudentJustification));

router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof StudentNotFoundError) return res.status(404).json({ message: error.message });
  if (error instanceof multer.MulterError || (error instanceof Error && error.message === 'Formato de arquivo inválido')) {
    return res.status(400).json({ error: error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
      ? 'Arquivo muito grande. Máximo 20MB.' : 'Formato inválido. Envie PDF, Word, imagem ou TXT.' });
  }
  console.error('Portal error:', error);
  return res.status(500).json({ message: 'Erro interno do servidor' });
});

export default router;
