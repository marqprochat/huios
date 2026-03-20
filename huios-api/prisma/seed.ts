import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    // Criar Super Admin se não existir
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

    // Criar Professor se não existir
    const existingTeacher = await prisma.teacher.findUnique({
        where: { email: 'professor@huios.com.br' }
    })

    if (!existingTeacher) {
        await prisma.teacher.create({
            data: {
                name: 'Professor Exemplo',
                email: 'professor@huios.com.br',
                phone: '(11) 99999-9999',
                cpf: '123.456.789-00',
                city: 'São Paulo'
            }
        })
        console.log('✅ Professor criado: professor@huios.com.br')
    } else {
        console.log('ℹ️  Professor já existe, pulando criação.')
    }

    // Criar Módulo se não existir
    const existingModule = await prisma.module.findFirst({
        where: { name: 'Fundamental' }
    })

    if (!existingModule) {
        await prisma.module.create({
            data: {
                name: 'Fundamental',
                description: 'Módulo Fundamental do Huios',
                workload: 40
            }
        })
        console.log('✅ Módulo criado: Fundamental')
    } else {
        console.log('ℹ️  Módulo já existe, pulando criação.')
    }

    // Criar Turma se não existir
    const existingClass = await prisma.class.findFirst({
        where: { name: 'Turma Fundamental - 2026' }
    })

    if (!existingClass) {
        const module = await prisma.module.findFirst({ where: { name: 'Fundamental' } })
        const teacher = await prisma.teacher.findFirst({ where: { email: 'professor@huios.com.br' } })
        
        if (module && teacher) {
            await prisma.class.create({
                data: {
                    name: 'Turma Fundamental - 2026',
                    location: 'São Paulo',
                    startDate: new Date('2026-03-01'),
                    endDate: new Date('2026-12-31'),
                    moduleId: module.id,
                    teacherId: teacher.id
                }
            })
            console.log('✅ Turma criada: Turma Fundamental - 2026')
        } else {
            console.log('❌ Módulo ou Professor não encontrados, não foi possível criar a turma')
        }
    } else {
        console.log('ℹ️  Turma já existe, pulando criação.')
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