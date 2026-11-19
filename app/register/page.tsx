import LocalAuthForm from '@/components/LocalAuthForm';
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return <LocalAuthForm register next={typeof next === 'string' ? next : undefined} />;
}
