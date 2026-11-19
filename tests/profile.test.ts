import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authError,profileName} from '../domain/profile';
test('profile display tolerates missing and malformed account metadata',()=>{
  assert.equal(profileName(), '');assert.equal(profileName({display_name:{admin:true}}),'');
  assert.equal(profileName({display_name:'Тимур'}),'Тимур');
  assert.equal(profileName({display_name:'a'.repeat(500)}).length,40);
});
test('auth feedback never exposes internal server details',()=>{
  assert.equal(authError({code:'invalid_credentials'}),'Логин, почта или пароль не подходят. Проверь данные и попробуй ещё раз.');
  assert.equal(authError(Error('PASSWORD_MISMATCH')),'Пароли не совпадают. Проверь повтор пароля.');
  assert.ok(!authError(Error('private database details')).includes('private'));
  assert.ok(authError(null).length>0);
});
