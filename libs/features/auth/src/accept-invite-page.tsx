import { useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, Input, Label } from '@app/ui';
import { AuthLayout } from './auth-layout';

export interface AcceptInvitePageProps {
  /** Whether a token was present in the URL. False renders an error state. */
  hasToken: boolean;
  onSubmit?: (values: { displayName: string; password: string }) => void;
  /** Optional error message (e.g. expired/used token from the API). */
  error?: string;
  pending?: boolean;
}

export function AcceptInvitePage({
  hasToken,
  onSubmit,
  error,
  pending = false,
}: AcceptInvitePageProps) {
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    onSubmit?.({ displayName: displayName.trim(), password });
  }

  if (!hasToken) {
    return (
      <AuthLayout>
        <div className="flex flex-col gap-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Урилга олдсонгүй
          </h1>
          <p className="text-sm text-muted-foreground">
            Энэ холбоос буруу эсвэл хугацаа нь дууссан байна. Админаасаа шинэ
            урилга авна уу.
          </p>
          <Link
            to="/login"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Нэвтрэх хуудас руу буцах
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Бүртгэлээ баталгаажуулах
          </h1>
          <p className="text-sm text-muted-foreground">
            Нэр болон нууц үгээ тохируулснаар та системд нэвтэрнэ.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-name" className="text-xs font-medium text-muted-foreground">
              Нэр
            </Label>
            <Input
              id="invite-name"
              type="text"
              autoComplete="name"
              placeholder="Таны нэр"
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="h-11 rounded-lg bg-neutral-50/50 dark:bg-neutral-900/50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-password" className="text-xs font-medium text-muted-foreground">
              Нууц үг (хамгийн багадаа 8 тэмдэгт)
            </Label>
            <Input
              id="invite-password"
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
            disabled={pending}
            className="h-11 w-full rounded-full bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {pending ? 'Түр хүлээнэ үү...' : 'Баталгаажуулж нэвтрэх'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
