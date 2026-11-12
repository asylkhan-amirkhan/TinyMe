import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, type Session } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const app = process.env.TEST_APP_URL || 'http://127.0.0.1:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw Error('Integration tests require the local backend');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, options);

test('registration, login, room, roles, session refresh and logout work together', async () => {
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
  const username = `test_${suffix}`;
  const email = `${username}@example.com`;
  const password = `Test-${crypto.randomUUID()}`;
  const users: string[] = [];
  const sessions: (typeof admin)[] = [];
  const send = async (action: string, body: unknown) => {
    const response = await fetch(`${app}/api/auth/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: app }, body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  const clientFor = async (session: Session) => {
    const client = createClient(url, key, options);
    sessions.push(client);
    assert.equal((await client.auth.setSession(session)).error, null);
    return client;
  };
  try {
    const input = { username, email, password, confirm: password, name: 'Проверка' };
    assert.equal((await send('register', { ...input, confirm: 'wrong' })).status, 400);
    assert.equal((await send('register', { ...input, username: 'bad@name' })).status, 400);
    const registered = await send('register', input);
    assert.equal(registered.status, 200, JSON.stringify(registered.data));
    assert.ok(registered.data.session, 'Local Auth must have email confirmations disabled');
    users.push(registered.data.session.user.id);
    const user = await clientFor(registered.data.session);
    assert.equal((await user.rpc('my_profile')).data.role, 'user');
    assert.equal((await user.rpc('bootstrap')).error, null);
    const duplicate = await send('register', input);
    assert.equal(duplicate.status, 409);
    assert.equal((await send('login', { identity: email, password: 'wrong password' })).status, 401);
    for (const identity of [email.toUpperCase(), username.toUpperCase()]) {
      const login = await send('login', { identity, password });
      assert.equal(login.status, 200);
      assert.equal(login.data.session.user.id, users[0]);
      const client = await clientFor(login.data.session);
      assert.equal((await client.auth.refreshSession()).error, null);
    }
    assert.ok((await user.rpc('admin_users')).error, 'Regular users cannot list accounts');
    assert.ok((await user.rpc('login_email', { p_username: username })).error, 'Login lookup is private');
    assert.ok((await user.from('user_profiles').update({ role: 'admin' }).eq('user_id', users[0])).error);
    assert.equal((await user.auth.updateUser({ data: { role: 'admin' } })).error, null);
    assert.equal((await user.rpc('my_profile')).data.role, 'user', 'Metadata cannot grant admin rights');
    assert.equal((await admin.from('user_profiles').update({ role: 'admin' }).eq('user_id', users[0])).error, null);
    assert.equal((await user.rpc('admin_users')).error, null);
    assert.ok((await user.rpc('admin_set_role', { p_user: users[0], p_role: 'user' })).error, 'Cannot demote oneself');

    const second = await send('register', { ...input, username: `${username}_2`, email: `other_${email}` });
    assert.equal(second.status, 200);
    users.push(second.data.session.user.id);
    const other = await clientFor(second.data.session);
    assert.equal((await other.rpc('bootstrap')).error, null);
    const privateRows = await other.from('accounts').select('user_id').eq('user_id', users[0]);
    assert.deepEqual(privateRows.data, []);
    assert.equal((await user.rpc('admin_set_role', { p_user: users[1], p_role: 'admin' })).error, null);
    assert.equal((await other.rpc('admin_users')).error, null);
    assert.equal((await user.rpc('admin_set_role', { p_user: users[1], p_role: 'user' })).error, null);
    assert.ok((await other.rpc('admin_users')).error, 'Role revocation is immediate');

    const { data: beforeLogout } = await user.auth.getSession();
    assert.equal((await user.auth.signOut({ scope: 'local' })).error, null);
    assert.equal((await user.auth.getSession()).data.session, null);
    const replay = await fetch(`${url}/rest/v1/rpc/admin_users`, {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${beforeLogout.session!.access_token}`, 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(replay.status, 401, 'Logged-out tokens cannot access the Data API');
    const expired = createClient(url, key, options);
    assert.ok((await expired.auth.refreshSession({ refresh_token: beforeLogout.session!.refresh_token })).error);
  } finally {
    for (const client of sessions) await client.auth.signOut({ scope: 'local' });
    for (const id of users.reverse()) await admin.auth.admin.deleteUser(id);
  }
});
