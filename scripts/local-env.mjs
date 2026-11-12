import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Use the pinned CLI and never print privileged keys in terminal output.
const cli = resolve('node_modules/supabase/dist/supabase.js');
try {
  const status = JSON.parse(execFileSync(process.execPath, [cli, 'status', '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  const values = {
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  };
  if (Object.values(values).some(value => typeof value !== 'string' || !value)) throw Error('Missing local credentials');
  const host = new URL(values.NEXT_PUBLIC_SUPABASE_URL).hostname;
  if (!['127.0.0.1', 'localhost'].includes(host)) throw Error('Expected a local backend');
  const file = '.env.local';
  let source = existsSync(file) ? readFileSync(file, 'utf8') : '';
  // Protect an existing cloud configuration from accidental replacement.
  const prior = source.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)?.[1];
  if (prior && !['127.0.0.1', 'localhost'].includes(new URL(prior).hostname)) {
    throw Error('Existing .env.local uses another backend. Back it up and remove its Supabase entries before running local:env.');
  }
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}\\s*=.*$`, 'm');
    source = pattern.test(source) ? source.replace(pattern, line) : source.trimEnd() + '\n' + line + '\n';
  }
  writeFileSync(file, source.trimStart(), { mode: 0o600 });
  console.log('Local settings written to .env.local. Restart Next.js after changing environment variables.');
} catch (error) {
  console.error('Cannot configure local environment. Start Docker and run npm run backend:start first.');
  if (error instanceof Error && !('stderr' in error)) console.error(error.message);
  process.exitCode = 1;
}
