export interface CurrentSessionUser {
    active: boolean;
    mustChangePassword: boolean;
}

export async function resolveCurrentSession<T extends { userId: string }>(
    session: T | null,
    findUser: (userId: string) => Promise<CurrentSessionUser | null>
): Promise<T | null> {
    if (!session) return null;

    const user = await findUser(session.userId);
    if (!user?.active || user.mustChangePassword) return null;

    return session;
}
