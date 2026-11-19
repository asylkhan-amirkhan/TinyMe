import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountsKey, sessionKey, registerLocal, loginLocal, currentLocalAccount, startLocalSession, canOpenWorkshop, localReturnPath } from '../lib/local-auth';
function memory() { const data = new Map<string,string>(); return { getItem:(key:string) => data.get(key) ?? null, setItem:(key:string,value:string) => { data.set(key,value); }, removeItem:(key:string) => { data.delete(key); } }; }
test('local sign-in returns to community details and only accepts internal application paths', () => {
  for (const path of ['/room', '/admin', '/community', '/catalog/desk-oak', '/catalog/workshop%3Achair', '/profiles/user-id', '/collections/list-id']) {
    assert.equal(localReturnPath(path), path);
  }
  for (const path of ['//example.test', 'https://example.test', '/catalog/%2Fexample.test', '/catalog/..', '/catalog/item?next=/admin', ['/catalog', '/admin']]) {
    assert.equal(localReturnPath(path), undefined);
  }
});
test('local registration hashes the password and login restores the chosen role', async () => {
  const storage = memory();
  const account = await registerLocal(storage, {name:'Local admin',email:' ADMIN@example.test ',password:'test-password-123',role:'admin'});
  assert.equal(account.email,'admin@example.test'); assert.equal(canOpenWorkshop(account),true);
  assert.ok(!storage.getItem(accountsKey)!.includes('test-password-123'));
  assert.deepEqual(await loginLocal(storage,'Admin@example.test','test-password-123'),account);
  await assert.rejects(loginLocal(storage,'admin@example.test','wrong-password'));
  await assert.rejects(loginLocal(storage,'unknown@example.test','test-password-123'));
});
test('user account cannot open workshop, session stores no password and logout clears access',async () => {
  const storage=memory(),session=memory();
  const account=await registerLocal(storage,{name:'Local user',email:'user@example.test',password:'test-password-123',role:'user'});
  assert.equal(canOpenWorkshop(account),false); assert.equal(currentLocalAccount(storage,session),null);
  startLocalSession(session,account); assert.deepEqual(currentLocalAccount(storage,session),account);
  assert.equal(session.getItem(sessionKey),account.id);
  session.removeItem(sessionKey); assert.equal(currentLocalAccount(storage,session),null);
});
test('accounts are independent between browser storage instances',async () => {
  const first=memory(),second=memory(),session=memory();
  const account=await registerLocal(first,{name:'First browser',email:'one@example.test',password:'test-password-123',role:'user'});
  startLocalSession(session,account); assert.equal(currentLocalAccount(second,session),null);
  await assert.rejects(loginLocal(second,'one@example.test','test-password-123'));
});
test('invalid registration and duplicate email preserve existing accounts',async () => {
  const storage=memory();
  await assert.rejects(registerLocal(storage,{name:'A',email:'invalid',password:'short',role:'user'}));
  assert.equal(storage.getItem(accountsKey),null);
  const draft={name:'Local user',email:'user@example.test',password:'test-password-123',role:'user' as const};
  await registerLocal(storage,draft); const original=storage.getItem(accountsKey);
  await assert.rejects(registerLocal(storage,{...draft,email:'USER@example.test',role:'admin'}));
  assert.equal(storage.getItem(accountsKey),original);
});
test('damaged account storage and write failure never become a successful registration',async () => {
  const storage=memory(); storage.setItem(accountsKey,'broken');
  const draft={name:'Local user',email:'user@example.test',password:'test-password-123',role:'user' as const};
  await assert.rejects(registerLocal(storage,draft)); assert.equal(storage.getItem(accountsKey),'broken');
  await assert.rejects(registerLocal({...memory(),setItem:()=>{throw new DOMException('Full','QuotaExceededError');}},draft));
});
