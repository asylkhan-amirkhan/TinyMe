import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { validateCredentials } from '@/domain/auth';

export const runtime = 'nodejs';
const respond = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store' },
});

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (action !== 'login' && action !== 'register') return respond({ code: 'NOT_FOUND' }, 404);
  const requestUrl = new URL(request.url);
  const originHeader = request.headers.get('origin');
  // Next.js can normalise request.url to localhost even when the browser uses 127.0.0.1.
  // Host describes the requested public address; do not trust arbitrary forwarded hosts.
  const host = request.headers.get('host') || requestUrl.host;
  let origin = `${requestUrl.protocol}//${host}`;
  if (originHeader) {
    try {
      const source = new URL(originHeader);
      if (!['http:', 'https:'].includes(source.protocol) || source.host !== host)
        return respond({ code: 'FORBIDDEN' }, 403);
      origin = source.origin;
    } catch { return respond({ code: 'FORBIDDEN' }, 403); }
  }
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return respond({ code: 'INVALID_INPUT' }, 415);
  let credentials;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return respond({ code: 'INVALID_INPUT' }, 413);
    credentials = validateCredentials(JSON.parse(raw), action === 'register');
  } catch (error) {
    return respond({ code: error instanceof SyntaxError ? 'INVALID_INPUT' : (error as Error).message }, 400);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !serviceKey) return respond({ code: 'AUTH_UNAVAILABLE' }, 503);
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  try {
    const admin = createClient(url, serviceKey, options);
    const client = createClient(url, key, options);
    // Shared, atomic database counters survive server restarts. No passwords or raw emails in counters.
    const bucket = createHmac('sha256', serviceKey).update(credentials.identity).digest('hex');
    const { data: allowed, error: limitError } = await admin.rpc('auth_attempt', { p_key: bucket });
    if (limitError) throw limitError;
    if (!allowed) return respond({ code: 'over_request_rate_limit' }, 429);
    if (action === 'register') {
      const { email, username, name, color, password } = credentials;
      const { data: existing, error: lookupError } = await admin.rpc('login_email', { p_username: username });
      if (lookupError) throw lookupError;
      if (existing) return respond({ code: 'USERNAME_TAKEN' }, 409);
      const { data, error } = await client.auth.signUp({ email, password, options: {
        emailRedirectTo: `${origin}/room?account=profile`,
        data: { username, display_name: name, avatar_color: color },
      } });
      if (error) return respond({ code: error.status === 429 ? 'over_request_rate_limit' : error.code === 'unexpected_failure' ? 'REGISTRATION_FAILED' : error.code }, error.status === 429 ? 429 : 400);
      return respond({ session: data.session });
    }
    let email = credentials.identity;
    if (!email.includes('@')) {
      const { data, error } = await admin.rpc('login_email', { p_username: email });
      if (error) throw error;
      // Go through Auth even for an unknown login; never expose its associated email.
      email = data || `unknown-${bucket}@example.invalid`;
    }
    const { data, error } = await client.auth.signInWithPassword({ email, password: credentials.password });
    if (error) return respond({ code: error.status === 429 ? 'over_request_rate_limit' : error.code === 'email_not_confirmed' ? error.code : 'invalid_credentials' }, error.status === 429 ? 429 : 401);
    return respond({ session: data.session });
  } catch {
    return respond({ code: 'AUTH_UNAVAILABLE' }, 503);
  }
}
