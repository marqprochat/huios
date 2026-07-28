import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { syncAuthorizationSeed } from '../src/lib/permissions/catalog'

const prisma = new PrismaClient()

async function main() {
  await syncAuthorizationSeed(prisma)

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
