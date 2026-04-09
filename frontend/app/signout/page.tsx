'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuth } from '@/lib/auth';

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear all auth data
    clearAuth();
    // Clear the auth cookie client-side
    document.cookie = 'bankbi-auth=; Path=/; Max-Age=0; SameSite=Lax';
    router.replace('/signin?logged_out=1');
  }, [router]);

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="text-[12px] text-text-muted">Signing out…</div>
    </div>
  );
}
