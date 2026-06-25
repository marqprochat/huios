import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { MatriculaLanding } from '../MatriculaLanding';
import { getOpenTurmas } from '../page';

export const dynamic = 'force-dynamic';

// Slugs reservados que NÃO são links de igreja (têm rota própria).
const RESERVED = new Set(['pagamento', 'turma']);

export default async function MatriculaSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED.has(slug)) notFound();

  const church = await (prisma as any).church.findUnique({ where: { publicSlug: slug } });
  if (!church || !church.isActive) notFound();

  const turmas = await getOpenTurmas();

  return (
    <MatriculaLanding
      turmas={turmas}
      church={{ name: church.name, isPartner: church.isPartner, slug }}
    />
  );
}
