import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const existingAdmin = await prisma.user.findUnique({
        where: { email: 'admin@huios.com.br' }
    })

    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin123', 12)

        await prisma.user.create({
            data: {
                name: 'Super Administrador',
                email: 'admin@huios.com.br',
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                active: true,
            }
        })

        console.log('✅ Super Admin criado: admin@huios.com.br / admin123')
    } else {
        console.log('ℹ️  Super Admin já existe, pulando criação.')
    }
}

main()
    .catch((e) => {
        console.error('❌ Erro ao executar seed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
