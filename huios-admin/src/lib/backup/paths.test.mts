import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import {
  UnsafeBackupFileNameError,
  buildBackupFileName,
  isSafeBackupFileName,
  resolveBackupFilePath,
} from './paths.ts';

const DIR = path.join('/srv', 'huios', 'backups');

test('resolve o caminho de um nome legítimo dentro do diretório de backups', () => {
  const nome = 'huios-backup-2026-09-02-030000-auto.tar.gz';

  assert.equal(resolveBackupFilePath(nome, DIR), path.join(DIR, nome));
});

test('recusa qualquer tentativa de escapar do diretório', () => {
  const perigosos = [
    '../.env',
    '../../etc/passwd.tar.gz',
    'sub/backup.tar.gz',
    'sub\\backup.tar.gz',
    '/etc/shadow.tar.gz',
    '..',
    '.',
    '.oculto.tar.gz',
  ];

  for (const nome of perigosos) {
    assert.equal(isSafeBackupFileName(nome), false, `deveria recusar: ${nome}`);
    assert.throws(() => resolveBackupFilePath(nome, DIR), UnsafeBackupFileNameError, nome);
  }
});

test('recusa nomes que não são pacotes .tar.gz', () => {
  assert.equal(isSafeBackupFileName('backup.zip'), false);
  assert.equal(isSafeBackupFileName('backup.tar'), false);
  assert.equal(isSafeBackupFileName(''), false);
});

test('recusa valores que nem sequer são texto', () => {
  assert.equal(isSafeBackupFileName(undefined), false);
  assert.equal(isSafeBackupFileName(null), false);
  assert.equal(isSafeBackupFileName(42), false);
  assert.equal(isSafeBackupFileName({ toString: () => 'x.tar.gz' }), false);
});

test('o nome gerado é sempre aceito de volta e carrega data, hora e tipo', () => {
  const nome = buildBackupFileName('PRE_RESTORE', new Date(2026, 8, 2, 3, 5, 7));

  assert.equal(nome, 'huios-backup-2026-09-02-030507-pre_restore.tar.gz');
  assert.equal(isSafeBackupFileName(nome), true);
});
