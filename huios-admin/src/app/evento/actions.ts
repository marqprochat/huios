'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { registerForEvent } from '@/lib/events';

export async function createPublicRegistration(
  _prevState: { success: boolean; message: string },
  formData: FormData,
) {
  const eventId = formData.get('eventId') as string;
  const ticketId = formData.get('ticketId') as string;
  const name = ((formData.get('name') as string) || '').trim();
  const email = ((formData.get('email') as string) || '').trim();
  const phone = ((formData.get('phone') as string) || '').trim() || null;
  const cpf = ((formData.get('cpf') as string) || '').trim() || null;

  if (!eventId || !ticketId) return { success: false, message: 'Selecione um lote de inscrição.' };
  if (!name || !email) return { success: false, message: 'Informe nome e e-mail.' };

  const answers: Record<string, string | boolean> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('answer_')) {
      const fieldId = key.replace('answer_', '');
      answers[fieldId] = value === 'true' ? true : value === 'false' ? false : String(value);
    }
  }

  const session = await getSession();
  let studentId: string | null = null;
  let isStudent = false;
  if (session?.role === 'ALUNO') {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { student: true } });
    if (user?.student) {
      studentId = user.student.id;
      isStudent = true;
    }
  }

  const result = await registerForEvent({
    eventId, ticketId, isStudent, studentId, name, email, phone, cpf, answers,
  });

  if (!result.ok) return { success: false, message: result.error };

  if (result.requiresPayment && result.transactionId) {
    redirect(`/matricula/pagamento/${result.transactionId}?retorno=/evento/inscricao/${result.registrationId}`);
  }
  redirect(`/evento/inscricao/${result.registrationId}`);
}
