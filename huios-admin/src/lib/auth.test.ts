import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCurrentSession } from './session-policy';

interface SessionRecord {
    active: boolean;
    mustChangePassword: boolean;
    student: { id: string } | null;
    adminRole: {
        key: string;
        active: boolean;
    } | null;
}

type ResolveCurrentSession = (
    session: TestSession | null,
    findUser: (userId: string) => Promise<SessionRecord | null>
) => Promise<TestSession | null>;

interface TestSession {
    id: string;
    userId: string;
    name: string;
    email: string;
    role: string;
    mustChangePassword: boolean;
}

const session: TestSession = {
    id: 'user-1',
    userId: 'user-1',
    name: 'Ana Souza',
    email: 'ana@example.com',
    role: 'SUPER_ADMIN',
    mustChangePassword: false,
};

function currentUser(
    overrides: Partial<SessionRecord> = {}
): SessionRecord {
    return {
        active: true,
        mustChangePassword: false,
        student: null,
        adminRole: null,
        ...overrides,
    };
}

test('current session resolution blocks pending-password and inactive users', async () => {
    const resolve: ResolveCurrentSession = resolveCurrentSession;

    assert.equal(
        await resolve(session, async () => currentUser({
            mustChangePassword: true,
        })),
        null
    );
    assert.equal(
        await resolve(session, async () => currentUser({
            active: false,
        })),
        null
    );
});

test('current session resolution replaces stale JWT role with the database role', async () => {
    const resolved = await resolveCurrentSession(
        session,
        async () => currentUser({
            adminRole: {
                key: 'COORDENADOR',
                active: true,
            },
        })
    );

    assert.equal(resolved?.role, 'COORDENADOR');
});

test('removing or deactivating the admin role immediately denies a legacy role guard', async () => {
    const studentOnly = await resolveCurrentSession(
        session,
        async () => currentUser({
            student: { id: 'student-1' },
        })
    );
    const noContext = await resolveCurrentSession(
        session,
        async () => currentUser({
            adminRole: {
                key: 'SUPER_ADMIN',
                active: false,
            },
        })
    );
    const canManageSettings = (role: string) => (
        role === 'SUPER_ADMIN' || role === 'COORDENADOR'
    );

    assert.equal(studentOnly?.role, 'ALUNO');
    assert.equal(canManageSettings(studentOnly?.role ?? ''), false);
    assert.equal(noContext?.role, '');
    assert.equal(canManageSettings(noContext?.role ?? ''), false);
});

test('current session resolution preserves active database-derived sessions', async () => {
    assert.deepEqual(
        await resolveCurrentSession(session, async () => currentUser({
            adminRole: {
                key: 'SUPER_ADMIN',
                active: true,
            },
        })),
        {
            ...session,
            role: 'SUPER_ADMIN',
        }
    );
});
