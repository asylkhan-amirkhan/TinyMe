import { supabase } from './supabase';

export async function authenticate(action: 'login' | 'register', input: Record<string, string>) {
  if (!supabase) throw Error('AUTH_UNAVAILABLE');
  const response = await fetch(`/api/auth/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.code || 'AUTH_UNAVAILABLE');
  if (result.session) {
    const { error } = await supabase.auth.setSession(result.session);
    if (error) throw error;
  }
  return !!result.session;
}
