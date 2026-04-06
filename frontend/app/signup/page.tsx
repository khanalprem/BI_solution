'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const DEMO_USERS_KEY = 'bankbi-demo-users';

interface DemoUser {
  email: string;
  password: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/dashboard/executive');
    }
  }, [router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    let users: DemoUser[] = [];
    const rawUsers = localStorage.getItem(DEMO_USERS_KEY);
    if (rawUsers) {
      try {
        users = JSON.parse(rawUsers) as DemoUser[];
      } catch {
        users = [];
      }
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailExists = users.some((user) => user.email.toLowerCase() === normalizedEmail);
    if (emailExists) {
      setError('Account already exists for this email.');
      setIsSubmitting(false);
      return;
    }

    users.push({ email: normalizedEmail, password });
    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
    localStorage.setItem('bankbi-user-name', name.trim());

    router.push(`/signin?registered=1&email=${encodeURIComponent(normalizedEmail)}`);
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
          <h2 className="text-lg font-semibold text-text-primary">Create account</h2>
          <p className="text-xs text-text-secondary mt-1 mb-5">
            Create your BankBI account to access dashboards.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-[rgba(239,68,68,0.25)] bg-accent-red-dim text-accent-red px-3 py-2 text-xs">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="block text-xs text-text-secondary mb-1">Full name</span>
              <Input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                required
              />
            </label>

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
                placeholder="At least 6 characters"
                autoComplete="new-password"
                required
              />
            </label>

            <label className="block">
              <span className="block text-xs text-text-secondary mb-1">Confirm password</span>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                required
              />
            </label>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-xs text-text-secondary">
            Already have an account?{' '}
            <Link href="/signin" className="text-accent-blue hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
