import { useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { MailCheck } from 'lucide-react';
import { Button, Input, Label } from '@app/ui';
import { AuthLayout } from './auth-layout';

export interface ForgotPasswordPageProps {
  onSubmit?: (email: string) => Promise<void> | void;
}

export function ForgotPasswordPage({ onSubmit }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || pending) return;
    setPending(true);
    try {
      await onSubmit?.(email.trim());
      setSent(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Нууц үг сэргээх
          </h1>
          <p className="text-sm text-muted-foreground">
            Бүртгэлтэй имэйл хаягаа оруулбал сэргээх холбоосыг илгээнэ.
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-6 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <MailCheck className="size-5" />
            </div>
            <p className="text-sm text-foreground">
              Хэрэв <span className="font-medium">{email}</span> бүртгэлтэй бол сэргээх
              холбоос бүхий имэйл удахгүй ирнэ.
            </p>
          </div>
        ) : (
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="forgot-email" className="text-xs font-medium text-muted-foreground">
                Имэйл
              </Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="name@email.com"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 rounded-lg bg-neutral-50/50 dark:bg-neutral-900/50"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={pending || !email.trim()}
              className="h-11 w-full rounded-full bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {pending ? 'Илгээж байна…' : 'Сэргээх холбоос илгээх'}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Нэвтрэх хуудас руу буцах
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
