'use client';
import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocalAccount } from '@/lib/use-local-account';
export default function LocalAccess({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { account, ready, error } = useLocalAccount();
  const router = useRouter(), pathname = usePathname();
  useEffect(() => { if (ready && !account && !error) router.replace(`/login?next=${encodeURIComponent(pathname)}`); }, [ready, account, error, router, pathname]);
  if (error) return <main style={{padding:40}}><h1>Не удалось открыть аккаунт</h1><p role="alert">{error}</p></main>;
  if (!ready || !account) return <main style={{padding:40}}><p role="status">Проверяем вход…</p></main>;
  if (admin && account.role !== 'admin') return <main style={{padding:40}}><h1>Мастерская для администратора</h1><p>Ты вошёл как пользователь.</p><Link href="/room">Вернуться в комнату</Link><p><Link href="/login">Войти в другой аккаунт</Link></p></main>;
  return children;
}
