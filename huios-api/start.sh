#!/bin/sh
set -e

echo "🔍 Verificando migrações falhadas..."

# Tenta resolver a migração falhada (marca como rolled-back)
# Se não existe ou já está ok, o comando falha silenciosamente
npx prisma migrate resolve --rolled-back 20260401130000_add_lesson_material 2>&1 || true

# Caso a tabela tenha sido parcialmente criada, dropar para permitir recriação limpa
# Usa DATABASE_URL direto via node para evitar dependência de psql no container
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$executeRawUnsafe('DROP TABLE IF EXISTS \"LessonMaterial\" CASCADE')
  .then(() => console.log('🗑️  Tabela LessonMaterial removida (se existia parcialmente).'))
  .catch(() => console.log('ℹ️  Tabela LessonMaterial não precisou ser removida.'))
  .finally(() => prisma.\$disconnect());
" 2>&1 || true

echo "🚀 Iniciando migrações..."
npx prisma migrate deploy

echo "✨ Iniciando seed..."
npx prisma db seed

echo "🌐 Iniciando servidor..."
node dist/index.js
