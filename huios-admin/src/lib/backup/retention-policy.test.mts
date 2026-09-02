import assert from 'node:assert/strict';
import test from 'node:test';

import { selectBackupsToDelete, type RetentionCandidate } from './retention-policy.ts';

function candidato(
  id: string,
  type: string,
  status: string,
  diasAtras: number,
): RetentionCandidate {
  return {
    id,
    fileName: `huios-backup-${id}.tar.gz`,
    type,
    status,
    createdAt: new Date(Date.UTC(2026, 8, 2) - diasAtras * 86_400_000),
  };
}

test('mantém apenas os N backups automáticos mais recentes', () => {
  const candidatos = [
    candidato('a', 'AUTO', 'SUCCESS', 0),
    candidato('b', 'AUTO', 'SUCCESS', 1),
    candidato('c', 'AUTO', 'SUCCESS', 2),
    candidato('d', 'AUTO', 'SUCCESS', 3),
  ];

  const removidos = selectBackupsToDelete(candidatos, 2).map((r) => r.id);

  assert.deepEqual(removidos, ['c', 'd']);
});

test('nunca remove backups manuais nem os gerados antes de uma restauração', () => {
  const candidatos = [
    candidato('manual-1', 'MANUAL', 'SUCCESS', 0),
    candidato('pre-1', 'PRE_RESTORE', 'SUCCESS', 1),
    candidato('auto-1', 'AUTO', 'SUCCESS', 2),
    candidato('auto-2', 'AUTO', 'SUCCESS', 3),
  ];

  const removidos = selectBackupsToDelete(candidatos, 1).map((r) => r.id);

  assert.deepEqual(removidos, ['auto-2']);
});

test('uma sequência de falhas não expulsa os backups bons da janela', () => {
  const candidatos = [
    candidato('falha-1', 'AUTO', 'FAILED', 0),
    candidato('falha-2', 'AUTO', 'FAILED', 1),
    candidato('falha-3', 'AUTO', 'FAILED', 2),
    candidato('bom-1', 'AUTO', 'SUCCESS', 3),
    candidato('bom-2', 'AUTO', 'SUCCESS', 4),
  ];

  const removidos = selectBackupsToDelete(candidatos, 2).map((r) => r.id);

  assert.deepEqual(removidos, ['falha-3']);
});

test('não apaga nada quando há menos backups que a retenção', () => {
  const candidatos = [candidato('a', 'AUTO', 'SUCCESS', 0)];

  assert.deepEqual(selectBackupsToDelete(candidatos, 14), []);
});

test('retenção inválida ainda preserva ao menos o backup mais recente', () => {
  const candidatos = [
    candidato('a', 'AUTO', 'SUCCESS', 0),
    candidato('b', 'AUTO', 'SUCCESS', 1),
  ];

  assert.deepEqual(selectBackupsToDelete(candidatos, 0).map((r) => r.id), ['b']);
  assert.deepEqual(selectBackupsToDelete(candidatos, -5).map((r) => r.id), ['b']);
});
