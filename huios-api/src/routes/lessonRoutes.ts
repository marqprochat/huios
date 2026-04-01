import { Router } from 'express';
import {
  getLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  checkIn
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
router.get('/', getLessons);
router.get('/:id', getLessonById);
router.post('/', createLesson);
router.put('/:id', updateLesson);
router.delete('/:id', deleteLesson);

// Check-in route (mobile)
router.post('/:lessonId/checkin', checkIn);

// Attendance routes (nested under lesson)
router.get('/:lessonId/attendances', getAttendancesByLesson);
router.put('/:lessonId/attendances/bulk', bulkUpdateAttendances);

// Material routes (nested under lesson)
router.post('/:lessonId/materials', upload.single('file'), uploadMaterial);
router.get('/:lessonId/materials', getMaterialsByLesson);
router.get('/:lessonId/materials/:id/download', downloadMaterial);
router.delete('/:lessonId/materials/:id', deleteMaterial);

export default router;
