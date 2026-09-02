export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const cron = await import('node-cron');
  const { processFinancialDueDates } = await import('./src/lib/jobs/financialDueDates');

  // Todo dia às 06:00 de Brasília: marca cobranças vencidas e notifica alunos.
  // O fuso é explícito porque o processo Node roda em UTC — sem ele, este job
  // disparava às 03:00 BRT.
  cron.schedule('0 6 * * *', async () => {
    try {
      const result = await processFinancialDueDates();
      console.log('[financialDueDates] executado:', result);
    } catch (error) {
      console.error('[financialDueDates] falhou:', error);
    }
  }, { timezone: 'America/Sao_Paulo' });

  // Backup automático. O cron dispara de hora em hora e a própria tarefa decide
  // se aquela é a hora configurada — assim, mudar o horário na tela de
  // Configurações passa a valer sem reiniciar o container.
  cron.schedule('0 * * * *', async () => {
    try {
      const { getBackupSettings } = await import('./src/lib/backup/settings');
      const settings = await getBackupSettings();
      if (!settings.backupEnabled) return;

      const horaBrasilia = Number(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour: 'numeric',
        hour12: false,
      }).format(new Date())) % 24; // hour12:false devolve 24 em alguns runtimes
      if (horaBrasilia !== settings.backupHour) return;

      const { criarBackup } = await import('./src/lib/backup/dump');
      const { aplicarRetencao } = await import('./src/lib/backup/retention');

      const resultado = await criarBackup({ tipo: 'AUTO' });
      const retencao = await aplicarRetencao();
      console.log('[backup] backup automático concluído:', resultado.fileName, retencao);
    } catch (error) {
      // A falha já ficou registrada em BackupRecord com status FAILED; aqui só
      // garantimos que o agendador siga vivo para a próxima janela.
      console.error('[backup] backup automático falhou:', error);
    }
  }, { timezone: 'America/Sao_Paulo' });
}
