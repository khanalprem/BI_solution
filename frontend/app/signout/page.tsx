import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function SignOutPage() {
  const cookieStore = await cookies();
  cookieStore.delete('bankbi-auth');
  redirect('/signin?logged_out=1');
}
