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
        console.log('ℹ️ Turma já existe, pulando criação.')
    }

    // Resetar senha do Super Admin (garantir que funcione)
    const hashedPassword = await bcrypt.hash('admin123', 12)
  
    await prisma.user.upsert({
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

    console.log('✅ Senha do Super Admin resetada: admin@huios.com.br / admin123')

    // ============================================================
    // PROVISIONAR USUÁRIOS PARA ALUNOS JÁ CADASTRADOS SEM LOGIN
    // Usa o CPF (somente dígitos) como senha padrão, ou 'huios123' se não tiver CPF
    // NÃO altera dados existentes — só cria User para quem ainda não tem
    // ============================================================
    const studentsWithoutUser = await prisma.student.findMany({
        where: { userId: null }
    })

    if (studentsWithoutUser.length > 0) {
        console.log(`\n📋 Encontrados ${studentsWithoutUser.length} aluno(s) sem usuário de login. Provisionando...`)
        
        let created = 0
        let skipped = 0
        let errors = 0

        for (const student of studentsWithoutUser) {
            try {
                // Verificar se já existe um User com esse email
                const existingUser = await prisma.user.findUnique({
                    where: { email: student.email }
                })

                if (existingUser) {
                    // User com esse email já existe, só vincular ao Student
                    await prisma.student.update({
                        where: { id: student.id },
                        data: { userId: existingUser.id }
                    })
                    console.log(`  🔗 Aluno "${student.name}" vinculado ao usuário existente (${student.email})`)
                    skipped++
                    continue
                }

                // Senha = CPF (somente dígitos) ou fallback 'huios123'
                const rawPassword = student.cpf 
                    ? student.cpf.replace(/\D/g, '') 
                    : 'huios123'
                
                const hashedPw = await bcrypt.hash(rawPassword, 12)

                const newUser = await prisma.user.create({
                    data: {
                        name: student.name,
                        email: student.email,
                        password: hashedPw,
                        role: 'ALUNO',
                        active: true,
                    }
                })

                // Vincular o User ao Student
                await prisma.student.update({
                    where: { id: student.id },
                    data: { userId: newUser.id }
                })

                const senhaInfo = student.cpf ? 'CPF (somente dígitos)' : 'huios123'
                console.log(`  ✅ Usuário criado para "${student.name}" (${student.email}) — senha: ${senhaInfo}`)
                created++
            } catch (err: any) {
                console.error(`  ❌ Erro ao criar usuário para "${student.name}" (${student.email}):`, err?.message)
                errors++
            }
        }

        console.log(`\n📊 Resultado: ${created} criados, ${skipped} vinculados, ${errors} erros`)
    } else {
        console.log('\nℹ️  Todos os alunos já possuem usuário de login.')
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