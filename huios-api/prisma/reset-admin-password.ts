import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Reset Super Admin password
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@huios.com.br' },
    update: {
      password: hashedPassword,
      active: true,
      role: 'SUPER_ADMIN'
    },
    create: {
      name: 'Super Administrador',
      email: 'admin@huios.com.br',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      active: true,
    }
  })

  console.log('✅ Super Admin resetado com sucesso!')
  console.log('   Email: admin@huios.com.br')
  console.log('   Senha: admin123')
  console.log('   ID:', admin.id)
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
