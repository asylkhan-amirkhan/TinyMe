// Shared by the form and the server. Passwords are never trimmed or normalised.
export const usernamePattern = /^[a-z0-9_]{3,30}$/;
export const normalizeIdentity = (value: string) => value.trim().toLowerCase();
export function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function validatePassword(password: string): void {
  if (password.length < 8 || new TextEncoder().encode(password).length > 72)
    throw Error('weak_password');
}
export type Credentials = { identity: string; password: string };
export type Registration = Credentials & { email: string; username: string; name: string; color: string };
export function validateCredentials(input: unknown, register: boolean): Registration {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('INVALID_INPUT');
  const data = input as Record<string, unknown>;
  const string = (key: string) => typeof data[key] === 'string' ? data[key] as string : '';
  const identity = normalizeIdentity(string('identity'));
  const password = string('password');
  if (!password || new TextEncoder().encode(password).length > 72) throw Error('INVALID_INPUT');
  if (!register) {
    if (!(validEmail(identity) || usernamePattern.test(identity))) throw Error('INVALID_IDENTITY');
    return { identity, password, email: '', username: '', name: '', color: '' };
  }
  const email = normalizeIdentity(string('email'));
  const username = normalizeIdentity(string('username'));
  const name = string('name').trim();
  const color = string('color');
  if (!validEmail(email)) throw Error('email_address_invalid');
  if (!usernamePattern.test(username)) throw Error('INVALID_USERNAME');
  if (!name || name.length > 40) throw Error('NAME_REQUIRED');
  validatePassword(password);
  if (password !== string('confirm')) throw Error('PASSWORD_MISMATCH');
  return { identity: email, password, email, username, name,
    color: /^#[0-9a-f]{6}$/i.test(color) ? color : '#bca9cd' };
}
