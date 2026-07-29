import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  uploadAttachment,
  getAttachmentsByTransaction,
  deleteAttachment,
  downloadAttachment,
  viewAttachment,
} from '../controllers/attachmentController';
import { authenticateToken } from '../middlewares/auth';
import { requireApiPermission } from '../auth/permissions';

// Armazenamento em disco (mesmo padrão dos materiais de aula).
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const transactionId = req.params.transactionId;
    const dir = path.join(process.cwd(), 'uploads', 'transactions', transactionId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

// Aceita PDFs e imagens (fotos/prints de comprovantes). 10MB.
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/');
    if (ok) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido. Envie PDF ou imagem.'));
  },
});

const router = Router();

router.post('/:transactionId/attachments', authenticateToken, requireApiPermission('financeiro.editar'), upload.single('file'), uploadAttachment);
router.get('/:transactionId/attachments', authenticateToken, requireApiPermission('financeiro.visualizar'), getAttachmentsByTransaction);
router.get('/:transactionId/attachments/:id/download', authenticateToken, requireApiPermission('financeiro.visualizar'), downloadAttachment);
router.get('/:transactionId/attachments/:id/view', authenticateToken, requireApiPermission('financeiro.visualizar'), viewAttachment);
router.delete('/:transactionId/attachments/:id', authenticateToken, requireApiPermission('financeiro.excluir'), deleteAttachment);

export default router;
