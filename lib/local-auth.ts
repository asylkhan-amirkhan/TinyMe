import { isShopPath } from '../domain/shop';
import { browserId } from './browser-id';

export type LocalRole = 'user' | 'admin';
export type LocalAccount = { id: string; name: string; email: string; role: LocalRole };
type StoredAccount = LocalAccount & { salt: string; hash: string };
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const accountsKey = 'tinyme:local-accounts:v1';
export const sessionKey = 'tinyme:local-session:v1';
export const localAuthEvent = 'tinyme:local-auth';
export function localReturnPath(value: string | string[] | undefined): string | undefined {
  if (typeof value !== 'string') return;
  if (isShopPath(value.split(/[?#]/, 1)[0])) return value;
  if (['/room', '/graph', '/admin', '/catalog', '/community'].includes(value)) return value;

  const match = /^\/(catalog|profiles|collections)\/((?:[a-z0-9_:-]|%3a)+)$/i.exec(value);
  if (match) return `/${match[1].toLowerCase()}/${encodeURIComponent(decodeURIComponent(match[2]))}`;
}
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
function accounts(storage: Pick<Storage, 'getItem'>): StoredAccount[] {
  const raw = storage.getItem(accountsKey);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (data.version !== 1 || !Array.isArray(data.accounts) || !data.accounts.every((a: StoredAccount) =>
    a && typeof a.id === 'string' && typeof a.name === 'string' && typeof a.email === 'string' && ['user','admin'].includes(a.role)
    && typeof a.salt === 'string' && /^[0-9a-f]{32}$/.test(a.salt) && typeof a.hash === 'string' && /^[0-9a-f]{64}$/.test(a.hash))) throw Error('Не удалось прочитать локальные аккаунты. Данные не изменены.');
  return data.accounts;
}
const publicAccount = ({ id, name, email, role }: StoredAccount): LocalAccount => ({ id, name, email, role });
async function passwordHash(password: string, salt: string) {
  const bytes = Uint8Array.from(salt.match(/../g)!, b => parseInt(b,16));
  const input = new TextEncoder().encode(password);
  if (!crypto.subtle) {
    const [{ pbkdf2Async }, { sha256 }] = await Promise.all([import('@noble/hashes/pbkdf2.js'), import('@noble/hashes/sha2.js')]);
    return hex(await pbkdf2Async(sha256, input, bytes, { c: 150000, dkLen: 32 }));
  }
  const key = await crypto.subtle.importKey('raw', input, 'PBKDF2', false, ['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: bytes, iterations: 150000 }, key, 256)));
}
export async function registerLocal(storage: Store, draft: { name: string; email: string; password: string; role: LocalRole }) {
  const name = draft.name.trim(), email = draft.email.trim().toLowerCase();
  if (name.length < 2 || name.length > 50) throw Error('Имя должно содержать от 2 до 50 символов.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw Error('Укажи корректный email.');
  if (draft.password.length < 8 || draft.password.length > 256) throw Error('Пароль должен содержать от 8 до 256 символов.');
  if (!['user','admin'].includes(draft.role)) throw Error('Выбери роль.');
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await passwordHash(draft.password, salt);
  const existing = accounts(storage);
  if (existing.some(a => a.email === email)) throw Error('В этом браузере уже есть аккаунт с таким email. Войди в него.');
  if (existing.length >= 50) throw Error('В этом браузере уже создано 50 аккаунтов.');
  const account: StoredAccount = { id: browserId(), name, email, role: draft.role, salt, hash };
  storage.setItem(accountsKey, JSON.stringify({ version: 1, accounts: [...existing, account] }));
  return publicAccount(account);
}
export async function loginLocal(storage: Pick<Storage, 'getItem'>, email: string, password: string) {
  const account = accounts(storage).find(a => a.email === email.trim().toLowerCase());
  if (!account || password.length > 256 || await passwordHash(password, account.salt) !== account.hash) throw Error('Email или пароль не совпадают.');
  return publicAccount(account);
}
export function currentLocalAccount(storage: Pick<Storage, 'getItem'>, session: Pick<Storage, 'getItem'>) {
  const id = session.getItem(sessionKey);
  return id ? accounts(storage).filter(a => a.id === id).map(publicAccount)[0] ?? null : null;
}
export function startLocalSession(session: Store, account: LocalAccount) { session.setItem(sessionKey, account.id); }
export const canOpenWorkshop = (account: LocalAccount | null) => account?.role === 'admin';
