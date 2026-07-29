import { Router } from 'express';
import {
  getStudentAttendanceReport,
  getDisciplineAttendanceReport
} from '../controllers/attendanceController';
import { authenticateToken } from '../middlewares/auth';
import { requireApiPermission } from '../auth/permissions';

const router = Router();

// Attendance reports
router.get('/student/:studentId', authenticateToken, requireApiPermission('presenca.visualizar'), getStudentAttendanceReport);
router.get('/discipline/:disciplineId', authenticateToken, requireApiPermission('presenca.visualizar'), getDisciplineAttendanceReport);

export default router;
