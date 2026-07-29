export interface CurrentSessionUser {
    active: boolean;
    mustChangePassword: boolean;
    student: { id: string } | null;
    adminRole: {
        key: string;
        active: boolean;
    } | null;
}

export async function resolveCurrentSession<
    T extends { userId: string; role: string }
>(
    session: T | null,
    findUser: (userId: string) => Promise<CurrentSessionUser | null>
): Promise<T | null> {
    if (!session) return null;

    const user = await findUser(session.userId);
    if (!user?.active || user.mustChangePassword) return null;

    const role = user.adminRole?.active
        ? user.adminRole.key
        : user.student
            ? 'ALUNO'
            : '';

    return {
        ...session,
        role,
    };
}
