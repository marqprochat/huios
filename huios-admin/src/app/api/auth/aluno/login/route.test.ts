import assert from 'node:assert/strict';
import test from 'node:test';
import { jwtVerify } from 'jose';

const JWT_SECRET = 'student-login-test-secret';

interface StudentLoginUser {
    id: string;
    name: string;
    email: string;
    role: string;
    mustChangePassword: boolean;
    adminRole: {
        key: string;
        active: boolean;
    } | null;
}

type CreateStudentSession = (
    user: StudentLoginUser
) => Promise<{ token: string; role: string }>;

test('student login session signs current password-change and role routing hints', async () => {
    process.env.JWT_SECRET = JWT_SECRET;

    const route = await import('./route');
    const createStudentSession = (
        route as typeof route & { createStudentSession?: CreateStudentSession }
    ).createStudentSession;
    assert.equal(
        typeof createStudentSession,
        'function',
        'student login must use the current routing-context session builder'
    );

    const session = await createStudentSession!({
        id: 'user-1',
        name: 'Ana Souza',
        email: 'ana@example.com',
        role: 'ALUNO',
        mustChangePassword: true,
        adminRole: {
            key: 'COORDENADOR',
            active: true,
        },
    });

    assert.equal(session.role, 'COORDENADOR');
    const { payload } = await jwtVerify(
        session.token,
        new TextEncoder().encode(JWT_SECRET)
    );
    assert.equal(payload.id, 'user-1');
    assert.equal(payload.userId, 'user-1');
    assert.equal(payload.role, 'COORDENADOR');
    assert.equal(payload.mustChangePassword, true);
    assert.equal(payload.permissions, undefined);
});
