'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Admin');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const storedName = localStorage.getItem('bankbi-user-name');
    const storedEmail = localStorage.getItem('bankbi-user-email');

    if (storedName) setName(storedName);
    if (storedEmail) {
      setEmail(storedEmail);
      setRole('Admin');
    }
  }, []);

  const handleSave = () => {
    if (!name.trim()) {
      setMessage('Please enter your name.');
      return;
    }

    localStorage.setItem('bankbi-user-name', name.trim());
    if (email.trim()) {
      localStorage.setItem('bankbi-user-email', email.trim());
    }
    setMessage('Profile updated successfully.');
  };

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />

      <main className="ml-[220px] flex-1 flex flex-col min-w-0">
        <TopBar title="User Profile" subtitle="Manage your account details" />

        <div className="p-6">
          <Card className="max-w-2xl p-5 rounded-xl">
            <CardContent className="p-0">
              <h2 className="text-base font-semibold mb-4">Profile Information</h2>

              <div className="grid gap-4">
                <label className="block">
                  <span className="block text-xs text-text-secondary mb-1">Full name</span>
                  <Input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your full name"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs text-text-secondary mb-1">Email</span>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@bank.com.np"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs text-text-secondary mb-1">Role</span>
                  <Input type="text" value={role} readOnly className="text-text-secondary" />
                </label>
              </div>

              {message && (
                <div className="mt-4 rounded-lg border border-border bg-bg-surface px-3 py-2 text-xs text-text-secondary">
                  {message}
                </div>
              )}

              <div className="mt-5">
                <Button type="button" onClick={handleSave}>
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
