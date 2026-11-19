import LocalAuthForm from '@/components/LocalAuthForm';
import { localReturnPath } from '@/lib/local-auth';

export default async function RegisterPage({ searchParams }: PageProps<'/register'>) {
  return <LocalAuthForm register next={localReturnPath((await searchParams).next)} />;
}
