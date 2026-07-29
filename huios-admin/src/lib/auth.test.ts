import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCurrentSession } from './session-policy';

interface SessionRecord {
    active: boolean;
    mustChangePassword: boolean;
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
    role: 'ALUNO',
    mustChangePassword: false,
};

test('current session resolution blocks pending-password and inactive users', async () => {
    const resolve: ResolveCurrentSession = resolveCurrentSession;

    assert.equal(
        await resolve(session, async () => ({
            active: true,
            mustChangePassword: true,
        })),
        null
    );
    assert.equal(
        await resolve(session, async () => ({
            active: false,
            mustChangePassword: false,
        })),
        null
    );
    assert.deepEqual(
        await resolve(session, async () => ({
            active: true,
            mustChangePassword: false,
        })),
        session
    );
});
