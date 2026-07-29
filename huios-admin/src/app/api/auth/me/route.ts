import { NextResponse } from 'next/server'
import { getAccessContext } from '@/lib/permissions/server'

export async function GET() {
    const context = await getAccessContext()

    if (!context) {
        return NextResponse.json(
            { error: 'Não autenticado.' },
            { status: 401 }
        )
    }

    return NextResponse.json({
        user: {
            id: context.userId,
            userId: context.userId,
            name: context.name,
            email: context.email,
            isStudent: context.isStudent,
            isAdmin: context.isAdmin,
            isSuperAdmin: context.isSuperAdmin,
            mustChangePassword: context.mustChangePassword,
            role: context.role,
            assignedClassIds: context.assignedClassIds,
            permissions: [...context.permissions],
        }
    })
}
