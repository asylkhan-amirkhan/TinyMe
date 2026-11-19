'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { communityClient } from '@/lib/community-repository';
import styles from './local-auth.module.css';

export default function CloudAuthForm({ register, next }: { register: boolean; next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email')).trim();
    const password = String(data.get('password'));
    setBusy(true);
    setMessage('');
    try {
      if (!communityClient) throw Error();
      const result = register
        ? await communityClient.auth.signUp({email, password, options: {data: {name: String(data.get('name')).trim()}}})
        : await communityClient.auth.signInWithPassword({email, password});
      if (result.error) {
        const messages: Record<string,string> = {
          invalid_credentials: 'Проверьте email и пароль TinyMe. Если раньше у вас была только локальная комната, создайте общий аккаунт один раз.',
          email_not_confirmed: 'Подтвердите email по ссылке из письма.',
          user_already_exists: 'Этот email уже зарегистрирован. Перейдите ко входу.',
          weak_password: 'Выберите более надёжный пароль.',
          over_email_send_rate_limit: 'Попробуйте запросить письмо позднее.'
        };
        setMessage(messages[result.error.code ?? ''] ?? 'Не удалось выполнить запрос. Проверьте данные и попробуйте ещё раз.');
      } else if (!result.data.session) {
        setMessage('Проверьте почту. После подтверждения email войдите в TinyMe с этим паролем.');
      } else {
        router.replace(next ?? '/room');
      }
    } catch {
      setMessage('Не удалось связаться с TinyMe. Проверьте соединение.');
    } finally { setBusy(false); }
  }
  return <main className={styles.page}><Link className={styles.brand} href="/">tiny me.</Link>
    <section className={styles.card}><h1>{register ? 'Создать аккаунт' : 'Войти в TinyMe'}</h1>
      <p className={styles.lead}>Один аккаунт для комнаты, отзывов и подборок.</p>
      <form onSubmit={submit}><fieldset className={styles.fields} disabled={busy}>
        {register && <label>Имя<input name="name" autoComplete="nickname" minLength={2} maxLength={50} required/></label>}
        <label>Email<input name="email" type="email" autoComplete="username" required/></label>
        <label>Пароль<input name="password" type="password" minLength={register ? 8 : undefined} autoComplete={register ? 'new-password' : 'current-password'} required/></label>
        {message && <p role="status">{message}</p>}
        <button className={styles.submit}>{busy ? 'Подождите…' : register ? 'Создать аккаунт' : 'Войти'}</button>
      </fieldset></form>
      <p className={styles.switch}><Link href={{pathname:register ? '/login' : '/register',query:next ? {next} : undefined}}>{register ? 'Уже есть аккаунт? Войти' : 'Создать аккаунт'}</Link></p>
    </section></main>;
}
