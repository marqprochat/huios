import { Router } from 'express';
import {
  getLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  checkIn,
  checkOut
} from '../controllers/lessonController';
import {
  getAttendancesByLesson,
  updateAttendance,
  bulkUpdateAttendances
} from '../controllers/attendanceController';
import {
  uploadMaterial,
  getMaterialsByLesson,
  deleteMaterial,
  downloadMaterial
} from '../controllers/materialController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middlewares/auth';
import { requireApiPermission } from '../auth/permissions';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const lessonId = req.params.lessonId;
    const dir = path.join(process.cwd(), 'uploads', 'lessons', lessonId);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

const router = Router();

// Lesson routes
router.get('/', authenticateToken, requireApiPermission('aulas.visualizar'), getLessons);
router.get('/:id', authenticateToken, requireApiPermission('aulas.visualizar'), getLessonById);
router.post('/', authenticateToken, requireApiPermission('aulas.criar'), createLesson);
router.put('/:id', authenticateToken, requireApiPermission('aulas.editar'), updateLesson);
router.delete('/:id', authenticateToken, requireApiPermission('aulas.excluir'), deleteLesson);

// Check-in/out route (mobile)
router.post('/:lessonId/checkin', authenticateToken, requireApiPermission('presenca.registrar'), checkIn);
router.post('/:lessonId/checkout', authenticateToken, requireApiPermission('presenca.registrar'), checkOut);

// Attendance routes (nested under lesson)
router.get('/:lessonId/attendances', authenticateToken, requireApiPermission('presenca.visualizar'), getAttendancesByLesson);
router.put('/:lessonId/attendances/bulk', authenticateToken, requireApiPermission('presenca.registrar'), bulkUpdateAttendances);

// Material routes (nested under lesson)
router.post('/:lessonId/materials', authenticateToken, requireApiPermission('aulas.editar'), upload.single('file'), uploadMaterial);
router.get('/:lessonId/materials', authenticateToken, requireApiPermission('aulas.visualizar'), getMaterialsByLesson);
router.get('/:lessonId/materials/:id/download', authenticateToken, requireApiPermission('aulas.visualizar'), downloadMaterial);
router.delete('/:lessonId/materials/:id', authenticateToken, requireApiPermission('aulas.editar'), deleteMaterial);

export default router;
