import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Aluno envia justificativa (arquivo) para uma falta
export const submitJustification = async (req: Request, res: Response) => {
  try {
    const { attendanceId } = req.params;
    const file = req.file;
    const studentId = (req as any).user?.studentId;

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        lesson: { include: { disciplines: { select: { id: true, name: true } } } }
      }
    });

    if (!attendance) {
      return res.status(404).json({ error: 'Presença não encontrada' });
    }

    if (attendance.studentId !== studentId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (attendance.status !== 'ABSENT') {
      return res.status(400).json({ error: 'Justificativa só pode ser enviada para faltas' });
    }

    // Verifica se já existe justificativa
    const existing = await prisma.absenceJustification.findUnique({
      where: { attendanceId }
    });
    if (existing) {
      // Remove arquivo anterior
      if (fs.existsSync(existing.filePath)) {
        fs.unlinkSync(existing.filePath);
      }
      await prisma.absenceJustification.delete({ where: { id: existing.id } });
    }

    const disciplineId = attendance.lesson.disciplines[0]?.id;
    if (!disciplineId) {
      return res.status(400).json({ error: 'Disciplina não encontrada para esta aula' });
    }

    const justification = await prisma.absenceJustification.create({
      data: {
        studentId,
        attendanceId,
        disciplineId,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: 'PENDING_REVIEW'
      },
      include: {
        student: { select: { id: true, name: true } },
        discipline: { select: { id: true, name: true } }
      }
    });

    // Cria notificação para o gestor/coordenador
    await prisma.notification.create({
      data: {
        type: 'JUSTIFICATION_SUBMITTED',
        title: 'Justificativa de falta enviada',
        message: `${justification.student.name} enviou um resumo para justificar a falta na disciplina "${justification.discipline.name}". Aguarda aprovação da diretoria.`,
        targetRole: 'COORDENADOR',
        relatedId: justification.id
      }
    });

    res.status(201).json(justification);
  } catch (error) {
    console.error('Error submitting justification:', error);
    res.status(500).json({ error: 'Erro ao enviar justificativa' });
  }
};

// Admin lista todas as justificativas pendentes
export const listPendingJustifications = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const justifications = await prisma.absenceJustification.findMany({
      where: status ? { status: status as any } : { status: 'PENDING_REVIEW' },
      include: {
        student: { select: { id: true, name: true, email: true } },
        discipline: { select: { id: true, name: true } },
        attendance: {
          include: { lesson: { select: { id: true, date: true, locationName: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(justifications);
  } catch (error) {
    console.error('Error listing justifications:', error);
    res.status(500).json({ error: 'Erro ao buscar justificativas' });
  }
};

// Admin aprova ou rejeita uma justificativa
export const reviewJustification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    const userId = (req as any).user?.id || 'system';

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status deve ser APPROVED ou REJECTED' });
    }

    const justification = await prisma.absenceJustification.update({
      where: { id },
      data: {
        status,
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null
      },
      include: {
        student: { select: { id: true, name: true } },
        discipline: { select: { id: true, name: true } }
      }
    });

    // Se aprovado, marca a falta como EXCUSED
    if (status === 'APPROVED') {
      await prisma.attendance.update({
        where: { id: justification.attendanceId },
        data: { status: 'EXCUSED', notes: 'Justificativa aprovada pela diretoria' }
      });
    }

    // Notificação de retorno ao aluno (via notificação geral)
    const action = status === 'APPROVED' ? 'aprovada' : 'reprovada';
    await prisma.notification.create({
      data: {
        type: 'JUSTIFICATION_REVIEWED',
        title: `Justificativa ${action}`,
        message: `A justificativa de ${justification.student.name} para a disciplina "${justification.discipline.name}" foi ${action}.`,
        targetRole: 'ALUNO',
        relatedId: justification.studentId
      }
    });

    res.json(justification);
  } catch (error) {
    console.error('Error reviewing justification:', error);
    res.status(500).json({ error: 'Erro ao revisar justificativa' });
  }
};

// Download do arquivo de justificativa
export const downloadJustification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const justification = await prisma.absenceJustification.findUnique({ where: { id } });

    if (!justification || !fs.existsSync(justification.filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    res.download(justification.filePath, justification.fileName);
  } catch (error) {
    console.error('Error downloading justification:', error);
    res.status(500).json({ error: 'Erro ao baixar arquivo' });
  }
};

// Lista notificações (para o admin/gestor)
export const listNotifications = async (req: Request, res: Response) => {
  try {
    const { role = 'COORDENADOR', unreadOnly } = req.query;

    const notifications = await prisma.notification.findMany({
      where: {
        targetRole: role as string,
        ...(unreadOnly === 'true' ? { read: false } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const unreadCount = await prisma.notification.count({
      where: { targetRole: role as string, read: false }
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error listing notifications:', error);
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
};

// Marca notificação como lida
export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Erro ao atualizar notificação' });
  }
};

// Busca justificativas do aluno
export const getStudentJustifications = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const justifications = await prisma.absenceJustification.findMany({
      where: { studentId },
      include: {
        discipline: { select: { id: true, name: true } },
        attendance: {
          include: { lesson: { select: { id: true, date: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(justifications);
  } catch (error) {
    console.error('Error fetching student justifications:', error);
    res.status(500).json({ error: 'Erro ao buscar justificativas' });
  }
};
