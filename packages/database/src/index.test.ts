import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DATABASE_SCHEMA_VERSION, migrationsPending } from './index.js';

test('database scaffold version', () => {
  assert.equal(DATABASE_SCHEMA_VERSION, 0);
  assert.equal(migrationsPending(), true);
});
