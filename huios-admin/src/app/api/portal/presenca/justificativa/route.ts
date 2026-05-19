import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { student: true }
    });

    if (!user?.student) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
    }

    const studentId = user.student.id;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const attendanceId = formData.get('attendanceId') as string | null;

    if (!file || !attendanceId) {
      return NextResponse.json({ error: 'Arquivo e ID da presença são obrigatórios' }, { status: 400 });
    }

    // Valida presença
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        lesson: { include: { disciplines: { select: { id: true, name: true } } } }
      }
    });

    if (!attendance) {
      return NextResponse.json({ error: 'Presença não encontrada' }, { status: 404 });
    }

    if (attendance.studentId !== studentId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (attendance.status !== 'ABSENT') {
      return NextResponse.json({ error: 'Justificativa só pode ser enviada para faltas' }, { status: 400 });
    }

    const discipline = attendance.lesson.disciplines[0];
    if (!discipline) {
      return NextResponse.json({ error: 'Disciplina não encontrada para esta aula' }, { status: 400 });
    }

    // Salva arquivo em disco
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'justificativas');
    await mkdir(uploadDir, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const savedFileName = `${uniqueSuffix}-${safeFileName}`;
    const filePath = path.join(uploadDir, savedFileName);

    await writeFile(filePath, buffer);

    // Remove justificativa anterior se existir
    const existing = await prisma.absenceJustification.findUnique({
      where: { attendanceId }
    });
    if (existing) {
      await prisma.absenceJustification.delete({ where: { id: existing.id } });
    }

    const relativePath = `justificativas/${savedFileName}`;

    const justification = await prisma.absenceJustification.create({
      data: {
        studentId,
        attendanceId,
        disciplineId: discipline.id,
        fileName: file.name,
        filePath: relativePath,
        fileSize: buffer.length,
        mimeType: file.type,
        status: 'PENDING_REVIEW'
      },
      include: {
        student: { select: { id: true, name: true } },
        discipline: { select: { id: true, name: true } }
      }
    });

    // Notifica gestor/coordenador
    await prisma.notification.create({
      data: {
        type: 'JUSTIFICATION_SUBMITTED',
        title: 'Justificativa de falta enviada',
        message: `${justification.student.name} enviou um resumo para justificar a falta na disciplina "${justification.discipline.name}". Aguarda aprovação da diretoria.`,
        targetRole: 'COORDENADOR',
        relatedId: justification.id
      }
    });

    return NextResponse.json(justification, { status: 201 });
  } catch (error) {
    console.error('Portal justificativa upload error:', error);
    return NextResponse.json({ error: 'Erro ao enviar justificativa' }, { status: 500 });
  }
}
