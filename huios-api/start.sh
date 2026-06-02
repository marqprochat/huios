#!/bin/sh
set -e

echo "🔍 Verificando migrações falhadas..."

# Resolve migrações que possam estar marcadas como failed no banco
npx prisma migrate resolve --rolled-back 20260401130000_add_lesson_material 2>&1 || true
npx prisma migrate resolve --rolled-back 20260413144500_lesson_many_disciplines 2>&1 || true

echo "🚀 Iniciando migrações..."
npx prisma migrate deploy

echo "🔧 Aplicando correções de schema..."
node prisma/fix-schema.js

echo "✨ Iniciando seed..."
npx prisma db seed

echo "🌐 Iniciando servidor..."
node dist/index.js
