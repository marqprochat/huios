export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const cron = await import('node-cron');
  const { processFinancialDueDates } = await import('./src/lib/jobs/financialDueDates');

  // Todo dia às 06:00 (horário do servidor): marca cobranças vencidas e notifica alunos.
  cron.schedule('0 6 * * *', async () => {
    try {
      const result = await processFinancialDueDates();
      console.log('[financialDueDates] executado:', result);
    } catch (error) {
      console.error('[financialDueDates] falhou:', error);
    }
  });
}
