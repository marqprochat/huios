// Atualiza o dia de vencimento das mensalidades já cadastradas para dia 10,
// mantendo o mês/ano originais. Só altera lançamentos PENDENTE/VENCIDO
// (não mexe em PAGO, para não reescrever histórico já liquidado).
import prisma from '../src/lib/prisma';

async function main() {
  const category = await (prisma as any).financialCategory.findFirst({
    where: { name: 'Mensalidade' },
  });
  if (!category) {
    console.log('Categoria "Mensalidade" não encontrada.');
    return;
  }

  const rows = await (prisma as any).financialTransaction.findMany({
    where: {
      categoryId: category.id,
      status: { in: ['PENDENTE', 'VENCIDO'] },
    },
    select: { id: true, dueDate: true },
  });

  let updated = 0;
  for (const row of rows) {
    const d = new Date(row.dueDate);
    if (d.getUTCDate() === 10) continue;
    const newDue = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 10));
    await (prisma as any).financialTransaction.update({
      where: { id: row.id },
      data: { dueDate: newDue },
    });
    updated++;
  }

  console.log(`Mensalidades verificadas: ${rows.length}. Atualizadas: ${updated}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
