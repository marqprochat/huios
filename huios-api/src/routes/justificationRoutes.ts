import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  submitJustification,
  listPendingJustifications,
  reviewJustification,
  downloadJustification,
  listNotifications,
  markNotificationRead,
  getStudentJustifications
} from '../controllers/justificationController';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'justifications');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

const router = Router();

// Aluno envia justificativa para uma falta específica
router.post('/attendance/:attendanceId', upload.single('file'), submitJustification);

// Aluno visualiza suas justificativas
router.get('/student/:studentId', getStudentJustifications);

// Admin: lista justificativas pendentes (ou todas com ?status=APPROVED)
router.get('/', listPendingJustifications);

// Admin: aprova ou rejeita justificativa
router.put('/:id/review', reviewJustification);

// Download do arquivo
router.get('/:id/download', downloadJustification);

// Notificações
router.get('/notifications', listNotifications);
router.put('/notifications/:id/read', markNotificationRead);

export default router;
