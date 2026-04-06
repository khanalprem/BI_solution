'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const DEFAULT_REDIRECT = '/dashboard/executive';
const DEMO_USERS_KEY = 'bankbi-demo-users';

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
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextPath, setNextPath] = useState(DEFAULT_REDIRECT);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const safeNextPath = getSafeNextPath(queryParams.get('next'));
    setNextPath(safeNextPath);
    const registered = queryParams.get('registered');
    const emailFromQuery = queryParams.get('email');
    const loggedOut = queryParams.get('logged_out');

    if (registered === '1') {
      setSuccess('Account created. Sign in with your new credentials.');
      if (emailFromQuery) {
        setEmail(emailFromQuery);
      }
    } else if (loggedOut === '1') {
      setSuccess('You have been signed out.');
    }

    const token = localStorage.getItem('token');
    if (token) {
      router.replace(safeNextPath);
      return;
    }

    const rememberedEmail = localStorage.getItem('bankbi-remember');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRemember(true);
    }
  }, [router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }

    const rawUsers = localStorage.getItem(DEMO_USERS_KEY);
    if (rawUsers) {
      try {
        const demoUsers: Array<{ email: string; password: string }> = JSON.parse(rawUsers);
        const existingUser = demoUsers.find(
          (user) => user.email.toLowerCase() === email.trim().toLowerCase()
        );
        if (existingUser && existingUser.password !== password) {
          setError('Invalid email or password.');
          return;
        }
      } catch {
        // Keep fallback demo behavior if storage is malformed
      }
    }

    setIsSubmitting(true);

    localStorage.setItem('token', 'demo-token');
    const normalizedEmail = email.trim().toLowerCase();
    localStorage.setItem('bankbi-user-email', normalizedEmail);

    const existingUserName = localStorage.getItem('bankbi-user-name');
    if (!existingUserName) {
      const defaultName = normalizedEmail.split('@')[0] || 'BankBI User';
      localStorage.setItem('bankbi-user-name', defaultName);
    }

    if (remember) {
      localStorage.setItem('bankbi-remember', email.trim());
    } else {
      localStorage.removeItem('bankbi-remember');
    }

    const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
    document.cookie = `bankbi-auth=1; Path=/; Max-Age=${maxAge}; SameSite=Lax`;

    router.push(nextPath);
  };

  return (
    <main className="min-h-screen bg-bg-base flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-accent-blue rounded-lg flex items-center justify-center text-white font-bold text-xl">
            B
          </div>
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

          {success && (
            <div className="mb-4 rounded-lg border border-[rgba(16,185,129,0.25)] bg-accent-green-dim text-accent-green px-3 py-2 text-xs">
              {success}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="block text-xs text-text-secondary mb-1">Work email</span>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@bank.com.np"
                autoComplete="email"
                required
              />
            </label>

            <label className="block">
              <span className="block text-xs text-text-secondary mb-1">Password</span>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-text-secondary">
              <Checkbox checked={remember} onCheckedChange={(checked) => setRemember(Boolean(checked))} />
              Remember this device
            </label>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-4 text-xs text-text-secondary">
            New to BankBI?{' '}
            <Link href="/signup" className="text-accent-blue hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
