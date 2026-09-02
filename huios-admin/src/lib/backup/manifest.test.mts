import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BACKUP_MANIFEST_VERSION,
  InvalidBackupError,
  buildManifest,
  parseManifest,
} from './manifest.ts';

test('buildManifest produz um manifest que parseManifest aceita', () => {
  const manifest = buildManifest({
    type: 'AUTO',
    includesUploads: true,
    appVersion: '0.1.0',
    schemaHash: 'abc123',
    createdAt: new Date('2026-09-02T06:00:00.000Z'),
  });

  const relido = parseManifest(JSON.stringify(manifest));

  assert.equal(relido.version, BACKUP_MANIFEST_VERSION);
  assert.equal(relido.type, 'AUTO');
  assert.equal(relido.includesUploads, true);
  assert.equal(relido.createdAt, '2026-09-02T06:00:00.000Z');
  assert.equal(relido.schemaHash, 'abc123');
});

test('recusa conteúdo que não é JSON', () => {
  assert.throws(() => parseManifest('não é json'), InvalidBackupError);
});

test('recusa JSON que não é um objeto', () => {
  assert.throws(() => parseManifest('[]'), InvalidBackupError);
  assert.throws(() => parseManifest('"texto"'), InvalidBackupError);
  assert.throws(() => parseManifest('null'), InvalidBackupError);
});

test('recusa manifest sem versão, com data inválida ou tipo desconhecido', () => {
  const base = {
    version: 1,
    createdAt: '2026-09-02T06:00:00.000Z',
    type: 'AUTO',
    includesUploads: true,
  };

  assert.throws(() => parseManifest(JSON.stringify({ ...base, version: undefined })), InvalidBackupError);
  assert.throws(() => parseManifest(JSON.stringify({ ...base, createdAt: 'ontem' })), InvalidBackupError);
  assert.throws(() => parseManifest(JSON.stringify({ ...base, type: 'QUALQUER' })), InvalidBackupError);
  assert.throws(() => parseManifest(JSON.stringify({ ...base, includesUploads: 'sim' })), InvalidBackupError);
});

test('recusa pacote gerado por uma versão mais nova do formato', () => {
  const futuro = JSON.stringify({
    version: BACKUP_MANIFEST_VERSION + 1,
    createdAt: '2026-09-02T06:00:00.000Z',
    type: 'MANUAL',
    includesUploads: false,
  });

  assert.throws(() => parseManifest(futuro), /versão mais nova/);
});

test('campos opcionais ausentes viram null em vez de quebrar', () => {
  const manifest = parseManifest(JSON.stringify({
    version: 1,
    createdAt: '2026-09-02T06:00:00.000Z',
    type: 'PRE_RESTORE',
    includesUploads: false,
  }));

  assert.equal(manifest.appVersion, null);
  assert.equal(manifest.schemaHash, null);
});
