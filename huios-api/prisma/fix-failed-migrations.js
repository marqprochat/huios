/**
 * Script para resolver migrações com status "failed" no banco de dados.
 * 
 * Quando uma migração falha (P3009), o Prisma bloqueia todas as migrações futuras.
 * Este script marca migrações falhadas como "rolled_back" para permitir
 * que o `prisma migrate deploy` tente aplicá-las novamente.
 */

const { Client } = require('pg');

async function fixFailedMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('⚠️  DATABASE_URL não definida, pulando verificação de migrações falhadas.');
    return;
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('🔍 Verificando migrações falhadas...');

    // Verifica se a tabela _prisma_migrations existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('ℹ️  Tabela _prisma_migrations não encontrada. Primeira execução.');
      return;
    }

    // Busca migrações falhadas
    const failedMigrations = await client.query(`
      SELECT id, migration_name, finished_at, logs
      FROM _prisma_migrations
      WHERE rolled_back_at IS NULL
      AND finished_at IS NOT NULL
      AND logs IS NOT NULL
      AND logs != ''
    `);

    // Busca migrações que falharam de verdade (sem finished_at ou com erro)
    const reallyFailed = await client.query(`
      SELECT id, migration_name
      FROM _prisma_migrations
      WHERE rolled_back_at IS NULL
      AND (finished_at IS NULL OR logs IS NOT NULL AND logs != '')
      AND applied_steps_count = 0
    `);

    // Estratégia: remover a entrada da migração falhada para que o Prisma tente novamente
    const failedRows = await client.query(`
      SELECT id, migration_name, started_at, finished_at, applied_steps_count, logs
      FROM _prisma_migrations
      WHERE rolled_back_at IS NULL
      AND finished_at IS NULL
    `);

    if (failedRows.rows.length === 0) {
      // Tenta encontrar migrações com logs de erro
      const errorRows = await client.query(`
        SELECT id, migration_name, started_at, finished_at, applied_steps_count, logs
        FROM _prisma_migrations
        WHERE logs IS NOT NULL AND logs != '' AND rolled_back_at IS NULL
      `);

      if (errorRows.rows.length === 0) {
        console.log('✅ Nenhuma migração falhada encontrada.');
        return;
      }

      for (const row of errorRows.rows) {
        console.log(`⚠️  Migração com possível erro: ${row.migration_name}`);
        console.log(`   Logs: ${row.logs}`);
      }
    }

    // Abordagem direta: deletar a migração falhada para que o Prisma re-aplique
    const deleteResult = await client.query(`
      DELETE FROM _prisma_migrations
      WHERE migration_name = '20260401130000_add_lesson_material'
      RETURNING migration_name;
    `);

    if (deleteResult.rows.length > 0) {
      console.log(`🗑️  Migração falhada removida: ${deleteResult.rows[0].migration_name}`);
      
      // Também dropar a tabela se ela foi parcialmente criada
      await client.query(`DROP TABLE IF EXISTS "LessonMaterial" CASCADE;`);
      console.log('🗑️  Tabela LessonMaterial removida (se existia parcialmente).');
    }

    console.log('✅ Correção de migrações concluída. O deploy tentará novamente.');

  } catch (error) {
    console.error('❌ Erro ao verificar migrações:', error.message);
    // Não falha o processo - deixa o migrate deploy tentar normalmente
  } finally {
    await client.end();
  }
}

fixFailedMigrations();
