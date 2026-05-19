/**
 * Script idempotente para corrigir schema do banco de dados.
 * Adiciona colunas e tabelas que podem estar faltando.
 * Seguro para executar múltiplas vezes.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSchema() {
  console.log('🔧 Verificando e aplicando correções de schema...');

  try {
    // 1. Adicionar statusDate na tabela Enrollment (se não existir)
    const hasStatusDate = await prisma.$queryRaw`
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'Enrollment' 
      AND column_name = 'statusDate'
    `;
    
    if (hasStatusDate.length === 0) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Enrollment" ADD COLUMN "statusDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`);
      console.log('  ✅ Coluna statusDate adicionada à tabela Enrollment');
    } else {
      console.log('  ℹ️  Coluna statusDate já existe');
    }

    // 2. Adicionar statusReason na tabela Enrollment (se não existir)
    const hasStatusReason = await prisma.$queryRaw`
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'Enrollment' 
      AND column_name = 'statusReason'
    `;
    
    if (hasStatusReason.length === 0) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Enrollment" ADD COLUMN "statusReason" TEXT`);
      console.log('  ✅ Coluna statusReason adicionada à tabela Enrollment');
    } else {
      console.log('  ℹ️  Coluna statusReason já existe');
    }

    // 3. Criar tabela TeacherEvaluation (se não existir)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TeacherEvaluation" (
        "id" TEXT NOT NULL,
        "disciplineId" TEXT NOT NULL,
        "clarity" TEXT NOT NULL,
        "engagement" TEXT NOT NULL,
        "mastery" TEXT NOT NULL,
        "observations" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TeacherEvaluation_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('  ℹ️  Tabela TeacherEvaluation verificada/criada');

    // 4. Criar tabela TeacherEvaluationSubmission (se não existir)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TeacherEvaluationSubmission" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "disciplineId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TeacherEvaluationSubmission_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('  ℹ️  Tabela TeacherEvaluationSubmission verificada/criada');

    // 5. Criar índice único (se não existir)
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "TeacherEvaluationSubmission_studentId_disciplineId_key" 
      ON "TeacherEvaluationSubmission"("studentId", "disciplineId")
    `);
    console.log('  ℹ️  Índice único TeacherEvaluationSubmission verificado/criado');

    // 6. Criar foreign key TeacherEvaluation -> Discipline (se não existir)
    const hasFk = await prisma.$queryRaw`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'TeacherEvaluation_disciplineId_fkey'
      AND table_schema = 'public'
    `;
    
    if (hasFk.length === 0) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "TeacherEvaluation" ADD CONSTRAINT "TeacherEvaluation_disciplineId_fkey" 
        FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      `);
      console.log('  ✅ Foreign key TeacherEvaluation_disciplineId_fkey criada');
    } else {
      console.log('  ℹ️  Foreign key TeacherEvaluation_disciplineId_fkey já existe');
    }

    // 7. Marcar migration como aplicada (se não estiver)
    const hasMigration = await prisma.$queryRaw`
      SELECT 1 FROM "_prisma_migrations" 
      WHERE "migration_name" = '20260519183000_add_status_date_and_evaluations'
    `;
    
    if (hasMigration.length === 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
        VALUES (gen_random_uuid()::text, 'manual_fix', NOW(), '20260519183000_add_status_date_and_evaluations', NULL, NULL, NOW(), 1)
      `);
      console.log('  ✅ Migration marcada como aplicada na tabela _prisma_migrations');
    } else {
      console.log('  ℹ️  Migration já está registrada');
    }

    console.log('✅ Todas as correções de schema foram aplicadas com sucesso!');
  } catch (err) {
    console.error('⚠️  Erro ao aplicar correções:', err.message);
    // Não faz throw para não impedir o startup
  } finally {
    await prisma.$disconnect();
  }
}

fixSchema();
