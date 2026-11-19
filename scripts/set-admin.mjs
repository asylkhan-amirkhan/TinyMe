import { createClient } from '@supabase/supabase-js';

// --env-file loads server-only credentials; no default administrator or password is shipped.
const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !url || !key) {
  console.error('Usage: npm run admin:grant -- registered-email@example.com (requires .env.local)');
  process.exit(1);
}
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) {
  console.error('This bootstrap command is restricted to the local backend.');
  process.exit(1);
}
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
try {
  let user;
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    user = data.users.find(candidate => candidate.email?.toLowerCase() === email);
    if (user || data.users.length < 100) break;
  }
  if (!user) throw Error('Register this email in the application first.');
  const { data, error } = await client.from('user_profiles').update({ role: 'admin' }).eq('user_id', user.id).select('username').single();
  if (error) throw error;
  console.log(`Administrator granted to ${data.username}. Open /admin or reload the room.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Could not grant the role. Check backend and migrations.');
  process.exitCode = 1;
}
