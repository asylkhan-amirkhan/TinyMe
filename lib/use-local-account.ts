'use client';
import { useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import { currentLocalAccount, localAuthEvent, sessionKey, type LocalAccount } from './local-auth';
import { communityClient, communityCloud } from './community-repository';
function subscribe(callback: () => void) {
  window.addEventListener(localAuthEvent, callback); window.addEventListener('storage', callback);
  return () => { window.removeEventListener(localAuthEvent, callback); window.removeEventListener('storage', callback); };
}
function snapshot() {
  try { return JSON.stringify({ account: currentLocalAccount(localStorage, sessionStorage), error: '' }); }
  catch { return JSON.stringify({ account: null, error: 'Локальное хранилище аккаунтов недоступно.' }); }
}
const serverSnapshot = () => '';
export function useLocalAccount() {
  const [cloud, setCloud] = useState<{account: LocalAccount | null; error: string; ready: boolean}>({account:null,error:'',ready:false});
  useEffect(() => {
    if (!communityClient) return;
    const {data} = communityClient.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setCloud({ready:true, error:'', account:user ? {
        id:user.id, email:user.email ?? '', name:String(user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Пользователь'),
        role:user.app_metadata.role === 'admin' ? 'admin' : 'user'
      } : null});
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const value = useSyncExternalStore(subscribe, communityCloud ? serverSnapshot : snapshot, serverSnapshot);
  const offline = useMemo(() => value ? { ...JSON.parse(value) as { account: LocalAccount | null; error: string }, ready: true }
    : { account: null, error: '', ready: false }, [value]);
  if (communityCloud && !communityClient) return {account:null,ready:true,error:'Подключение Supabase не настроено.'};
  return communityCloud ? cloud : offline;
}
export async function localSignOut() { if (communityClient) { const {error} = await communityClient.auth.signOut({scope:'local'}); if(error) throw error; } sessionStorage.removeItem(sessionKey); window.dispatchEvent(new Event(localAuthEvent)); }
