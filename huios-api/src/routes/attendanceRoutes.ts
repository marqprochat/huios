import { Router } from 'express';
import {
  getStudentAttendanceReport,
  getDisciplineAttendanceReport
} from '../controllers/attendanceController';

const router = Router();

// Attendance reports
router.get('/student/:studentId', getStudentAttendanceReport);
router.get('/discipline/:disciplineId', getDisciplineAttendanceReport);

export default router;
