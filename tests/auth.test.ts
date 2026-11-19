import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCredentials, validatePassword } from '../domain/auth';
import { POST } from '../app/api/auth/[action]/route';

const registration = { username: ' Test_User ', email: ' Alice@Example.com ', name: ' Алиса ', password: 'long password ', confirm: 'long password ' };
test('registration normalises identities and preserves the exact password', () => {
  const result = validateCredentials(registration, true);
  assert.equal(result.email, 'alice@example.com');
  assert.equal(result.username, 'test_user');
  assert.equal(result.name, 'Алиса');
  assert.equal(result.password, 'long password ');
});
test('registration rejects malformed fields, short passwords and mismatched confirmation', () => {
  for (const input of [null, [], {}, { ...registration, email: 'bad@' }, { ...registration, username: 'a@b' },
    { ...registration, name: ' ' }, { ...registration, name: 'a'.repeat(41) },
    { ...registration, password: 'short' }, { ...registration, confirm: 'different' }]) {
    assert.throws(() => validateCredentials(input, true));
  }
  assert.throws(() => validatePassword('я'.repeat(37)), /weak_password/);
  assert.doesNotThrow(() => validatePassword('я'.repeat(36)));
});
test('login accepts email or case-insensitive login, including existing shorter passwords', () => {
  assert.equal(validateCredentials({ identity: ' TEST_User ', password: 'oldpass' }, false).identity, 'test_user');
  assert.equal(validateCredentials({ identity: ' A@Example.com ', password: 'oldpass' }, false).identity, 'a@example.com');
  assert.throws(() => validateCredentials({ identity: 'bad login', password: 'x' }, false));
});
test('auth route rejects malformed, cross-origin and oversized requests before accessing backend', async () => {
  const context = { params: Promise.resolve({ action: 'register' }) };
  const send = (body: string, headers: Record<string,string> = {}) => POST(new Request('http://localhost:3000/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body,
  }), context);
  assert.equal((await send('{')).status, 400);
  assert.equal((await send('[]')).status, 400);
  assert.equal((await send(JSON.stringify(registration), { origin: 'https://other.example' })).status, 403);
  assert.equal((await send('a'.repeat(4097))).status, 413);
  assert.equal((await send('{}', { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await send('{}', { origin: 'http://127.0.0.1:3000', host: '127.0.0.1:3000' })).status, 400,
    'A same-origin request must reach validation even if Next.js normalises the internal URL to localhost');
});
