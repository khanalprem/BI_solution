'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import apiClient from '@/lib/api';
import { storeUser, type AuthUser } from '@/lib/auth';

const DEFAULT_REDIRECT = '/dashboard/executive';

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath) return DEFAULT_REDIRECT;
  if (!nextPath.startsWith('/dashboard')) return DEFAULT_REDIRECT;
  return nextPath;
}

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextPath, setNextPath] = useState(DEFAULT_REDIRECT);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    setNextPath(getSafeNextPath(queryParams.get('next')));

    // Already signed in
    const token = localStorage.getItem('token');
    if (token && token !== 'demo-token') {
      router.replace(DEFAULT_REDIRECT);
      return;
    }

    const rememberedEmail = localStorage.getItem('bankbi-remember');
    if (rememberedEmail) { setEmail(rememberedEmail); setRemember(true); }
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Clear only auth-related data (keep sidebar/theme preferences)
      localStorage.removeItem('token');
      localStorage.removeItem('bankbi-user');
      localStorage.removeItem('bankbi-user-name');
      localStorage.removeItem('bankbi-user-email');
      localStorage.removeItem('bankbi-auth-token');
      document.cookie = 'bankbi-auth=; Path=/; Max-Age=0';

      const { data } = await apiClient.post<{ token: string; user: AuthUser }>('/auth/signin', {
        email: email.trim().toLowerCase(),
        password,
      });

      // Store token + user
      storeUser(data.user, data.token);

      if (remember) {
        localStorage.setItem('bankbi-remember', email.trim());
      } else {
        localStorage.removeItem('bankbi-remember');
      }

      const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
      document.cookie = `bankbi-auth=1; Path=/; Max-Age=${maxAge}; SameSite=Lax`;

      router.push(nextPath);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Invalid email or password.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg-base flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-accent-blue rounded-lg flex items-center justify-center text-white font-bold text-xl">B</div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">BankBI</h1>
            <p className="text-xs text-text-muted">Nepal Banking Intelligence Platform</p>
          </div>
        </div>

        <CardContent className="p-0">
          <h2 className="text-lg font-semibold text-text-primary">Sign in</h2>
          <p className="text-xs text-text-secondary mt-1 mb-5">
            Use your work email to access dashboard reports.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-[rgba(239,68,68,0.25)] bg-accent-red-dim text-accent-red px-3 py-2 text-xs">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="block text-xs text-text-secondary mb-1">Work email</span>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="demo@gmail.com" autoComplete="email" required />
            </label>

            <label className="block">
              <span className="block text-xs text-text-secondary mb-1">Password</span>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" required />
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
              <Checkbox checked={remember} onCheckedChange={checked => setRemember(Boolean(checked))} />
              Remember this device
            </label>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-4 p-3 rounded-lg bg-bg-input border border-border text-[11px] text-text-muted">
            Demo: <span className="text-text-primary font-medium">demo@gmail.com</span> / <span className="text-text-primary font-medium">demo</span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
