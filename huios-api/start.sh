#!/bin/sh
set -e

echo "🔍 Verificando migrações falhadas..."

# Resolve migração antiga que pode estar marcada como failed no banco
npx prisma migrate resolve --rolled-back 20260401130000_add_lesson_material 2>&1 || true

# Resolve a nova migração caso tenha falhado em tentativa anterior
npx prisma migrate resolve --rolled-back 20260401130000_add_missing_models 2>&1 || true

echo "🚀 Iniciando migrações..."
npx prisma migrate deploy

echo "✨ Iniciando seed..."
npx prisma db seed

echo "🌐 Iniciando servidor..."
node dist/index.js
