const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    await prisma.enrollment.updateMany({
        where: { status: 'ACTIVE' },
        data: { status: 'CURSANDO' }
    });
    console.log('Updated ACTIVE to CURSANDO');
}
main().catch(console.error).finally(() => prisma.$disconnect());
