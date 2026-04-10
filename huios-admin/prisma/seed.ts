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
