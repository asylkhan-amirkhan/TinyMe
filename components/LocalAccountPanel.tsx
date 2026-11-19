'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Users } from 'lucide-react';
import { localSignOut, useLocalAccount } from '@/lib/use-local-account';
import styles from './local-profile.module.css';

export default function LocalAccountPanel() {
  const { account } = useLocalAccount();
  const router = useRouter();
  if (!account) return null;
  const href = '/profiles/' + encodeURIComponent(account.id);

  return <section className={styles.card}>
    <div className={styles.identity}>
      <span className={styles.avatar} aria-hidden="true">{account.name.slice(0,1).toUpperCase()}</span>
      <div><h2>{account.name}</h2><p>{account.email}</p></div>
    </div>
    <div className={styles.row}><strong>Комната</strong><span>{account.role === 'admin' ? 'Администратор · доступ к мастерской' : 'Пользователь'}</span></div>
    <p>Комната, музыка и прогресс сохраняются в этом браузере.</p>
    <Link className={styles.social} href={href}><Users size={20}/><span><strong>Профиль сообщества</strong><small>Отзывы и подборки товаров</small></span><ArrowUpRight size={18}/></Link>
    <button className={styles.logout} onClick={async () => {try {await localSignOut(); router.replace('/login');} catch {window.alert('Не удалось выйти. Попробуйте снова.');}}}>Выйти из TinyMe</button>
  </section>;
}
