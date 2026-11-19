import LocalAuthForm from '@/components/LocalAuthForm';
import { localReturnPath } from '@/lib/local-auth';

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  return <LocalAuthForm next={localReturnPath((await searchParams).next)} />;
}
