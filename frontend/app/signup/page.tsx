'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// SECURITY (C-5b, fixed 2026-04-25): the previous version of this page wrote
// (email, plaintext password) tuples to localStorage as `bankbi-demo-users`
// and never spoke to the backend. That created a phishing/credential-theft
// surface (any XSS could exfiltrate the list) AND misled users into thinking
// they had registered when their account did not exist on the server.
//
// BankBI is an internal banking tool — onboarding is admin-driven via
// POST /api/v1/users (UsersController). This page is now a static notice.
// If self-service signup is ever needed, build a backend endpoint with email
// verification, password complexity rules, and rate limiting BEFORE wiring
// up a real form here.
export default function SignUpPage() {
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
          <h2 className="text-lg font-semibold text-text-primary">Account by invitation</h2>
          <p className="text-xs text-text-secondary mt-1 mb-5">
            BankBI accounts are provisioned by your bank&apos;s administrator.
            If you need access, please contact your admin or the BankBI
            support team — they will create your account and email you the
            sign-in credentials.
          </p>

          <Link href="/signin" className="block">
            <Button type="button" className="w-full">Back to sign in</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
