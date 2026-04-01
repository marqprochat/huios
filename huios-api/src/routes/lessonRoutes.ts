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

export default router;
