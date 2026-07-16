import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Docker startup script', () => {
  it('uses Unix line endings so Alpine can execute its shebang', async () => {
    const script = await readFile(resolve(process.cwd(), 'start.sh'));

    expect(script.includes(13)).toBe(false);
  });

  it('can deploy the check-in buffer migration when the column already exists', async () => {
    const migration = await readFile(
      resolve(process.cwd(), 'prisma/migrations/20260715203000_add_checkin_buffer_minutes/migration.sql'),
      'utf8'
    );

    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS "checkInBufferMinutes"/);
  });

  it('recovers a previously failed check-in buffer migration before deploy', async () => {
    const script = await readFile(resolve(process.cwd(), 'start.sh'), 'utf8');

    expect(script).toContain(
      'prisma migrate resolve --rolled-back 20260715203000_add_checkin_buffer_minutes'
    );
  });
});
