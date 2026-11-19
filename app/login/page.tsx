import LocalAuthForm from '@/components/LocalAuthForm';
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return <LocalAuthForm next={typeof next === 'string' ? next : undefined} />;
}
