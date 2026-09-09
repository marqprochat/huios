import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import InscricaoForm from './InscricaoForm';

export const dynamic = 'force-dynamic';

export default async function InscricaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { slug } = await params;
  const { ticket: ticketId } = await searchParams;

  const evento = await (prisma as any).event.findFirst({
    where: { publicSlug: slug, isPublished: true, registrationEnabled: true },
    include: { tickets: true, customFields: { orderBy: { order: 'asc' } } },
  });
  if (!evento) notFound();

  const ticket = evento.tickets.find((t: any) => t.id === ticketId);
  if (!ticket) redirect(`/evento/${slug}`);

  const session = await getSession();
  let prefill = { name: '', email: '', phone: '', cpf: '' };
  if (session?.role === 'ALUNO') {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { student: true } });
    if (user?.student) {
      prefill = { name: user.student.name, email: user.student.email, phone: user.student.phone ?? '', cpf: user.student.cpf ?? '' };
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <InscricaoForm
          eventId={evento.id}
          eventTitle={evento.title}
          ticket={{ id: ticket.id, name: ticket.name, priceStudent: ticket.priceStudent, priceGeneral: ticket.priceGeneral }}
          isStudent={session?.role === 'ALUNO'}
          customFields={evento.customFields.map((f: any) => ({ id: f.id, label: f.label, type: f.type, options: f.options, required: f.required }))}
          prefill={prefill}
        />
      </div>
    </div>
  );
}
