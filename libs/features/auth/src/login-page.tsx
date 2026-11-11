import { useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, Input, Label } from '@app/ui';
import { AuthLayout } from './auth-layout';
import { GoogleIcon } from './google-icon';

export interface LoginPageProps {
  onSubmit?: (values: { email: string; password: string }) => void;
  /** Begins the backend Google OAuth redirect. Omit to hide the Google button
   *  (e.g. when the BE has Google sign-in disabled). */
  onGoogle?: () => void;
  /** Optional error message (e.g. from a failed login or Google redirect). */
  error?: string;
}

export function LoginPage({ onSubmit, onGoogle, error }: LoginPageProps) {
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
          Тавтай морил
        </h1>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {onGoogle && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-11 w-full justify-center rounded-full bg-neutral-100 text-sm font-medium text-foreground shadow-none hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              onClick={onGoogle}
            >
              <GoogleIcon className="size-5" />
              Google-ээр нэвтрэх
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              эсвэл имэйлээр
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-email" className="text-xs font-medium text-muted-foreground">
              Имэйл
            </Label>
            <Input
              id="login-email"
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
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-xs font-medium text-muted-foreground">
                Нууц үг
              </Label>
              <Link
                to="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Мартсан уу?
              </Link>
            </div>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
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
            Нэвтрэх
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Бүртгэлгүй юу?{' '}
          <Link
            to="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Бүртгүүлэх
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
