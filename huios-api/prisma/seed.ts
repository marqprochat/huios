import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { syncAuthorizationSeed } from '../../huios-admin/src/lib/permissions/catalog'

const prisma = new PrismaClient()

async function main() {
  await syncAuthorizationSeed(prisma)

  const existingTeacher = await prisma.teacher.findUnique({
    where: { email: 'professor@huios.com.br' },
  })

  if (!existingTeacher) {
    await prisma.teacher.create({
      data: {
        name: 'Professor Exemplo',
        email: 'professor@huios.com.br',
        phone: '(11) 99999-9999',
        cpf: '123.456.789-00',
        city: 'Sao Paulo',
      },
    })
    console.log('Created sample teacher.')
  } else {
    console.log('Sample teacher already exists.')
  }

  const existingModule = await prisma.module.findFirst({
    where: { name: 'Fundamental' },
  })

  if (!existingModule) {
    await prisma.module.create({
      data: {
        name: 'Fundamental',
        description: 'Modulo Fundamental do Huios',
        workload: 40,
      },
    })
    console.log('Created Fundamental module.')
  } else {
    console.log('Fundamental module already exists.')
  }

  const existingClass = await prisma.class.findFirst({
    where: { name: 'Turma Fundamental - 2026' },
  })

  if (!existingClass) {
    const module = await prisma.module.findFirst({ where: { name: 'Fundamental' } })
    const teacher = await prisma.teacher.findFirst({ where: { email: 'professor@huios.com.br' } })

    if (module && teacher) {
      await prisma.class.create({
        data: {
          name: 'Turma Fundamental - 2026',
          location: 'Sao Paulo',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-12-31'),
          moduleId: module.id,
          teacherId: teacher.id,
        },
      })
      console.log('Created sample class.')
    } else {
      console.error('Could not create sample class because module or teacher is missing.')
    }
  } else {
    console.log('Sample class already exists.')
  }

  const studentsWithoutUser = await prisma.student.findMany({
    where: { userId: null },
  })

  if (studentsWithoutUser.length > 0) {
    console.log(`Found ${studentsWithoutUser.length} student(s) without login. Provisioning...`)

    let created = 0
    let skipped = 0
    let errors = 0

    for (const student of studentsWithoutUser) {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: student.email },
        })

        if (existingUser) {
          await prisma.student.update({
            where: { id: student.id },
            data: { userId: existingUser.id },
          })
          console.log(`Linked student "${student.name}" to existing user (${student.email})`)
          skipped++
          continue
        }

        const rawPassword = student.cpf
          ? student.cpf.replace(/\D/g, '')
          : 'huios123'
        const hashedPassword = await bcrypt.hash(rawPassword, 12)

        const newUser = await prisma.user.create({
          data: {
            name: student.name,
            email: student.email,
            password: hashedPassword,
            role: 'ALUNO',
            active: true,
          },
        })

        await prisma.student.update({
          where: { id: student.id },
          data: { userId: newUser.id },
        })

        console.log(`Created user for student "${student.name}" (${student.email})`)
        created++
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error provisioning student "${student.name}" (${student.email}): ${message}`)
        errors++
      }
    }

    console.log(`Provisioning result: ${created} created, ${skipped} linked, ${errors} errors`)
  } else {
    console.log('All students already have a login user.')
  }
}

main()
  .catch((error) => {
    console.error('Error running seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
