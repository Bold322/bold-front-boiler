import { useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, Input, Label } from '@app/ui';
import { AuthLayout } from './auth-layout';

export interface SignupPageProps {
  onSubmit?: (values: { email: string; password: string }) => void;
}

export function SignupPage({ onSubmit }: SignupPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit?.({ email, password });
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-8">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-foreground">
          Шинэ бүртгэл үүсгэх
        </h1>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="signup-email" className="text-xs font-medium text-muted-foreground">
              Имэйл
            </Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="name@email.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-lg bg-neutral-50/50 dark:bg-neutral-900/50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="signup-password" className="text-xs font-medium text-muted-foreground">
              Нууц үг
            </Label>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-lg bg-neutral-50/50 dark:bg-neutral-900/50"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-11 w-full rounded-full bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Бүртгүүлэх
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Бүртгэлтэй юу?{' '}
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Нэвтрэх
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
