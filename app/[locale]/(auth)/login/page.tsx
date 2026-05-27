'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const res = await signIn('credentials', { ...data, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error(t('loginError'));
    } else {
      router.push(`/${locale}/dashboard`);
      router.refresh();
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Card */}
      <div className="rounded-2xl p-8"
        style={{
          background: 'rgba(15,23,42,0.8)',
          border: '1px solid rgba(99,102,241,0.2)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
        }}
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 0 24px rgba(99,102,241,0.5)' }}
          >
            <Bot size={24} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">{t('loginTitle')}</h1>
            <p className="mt-1 text-sm text-slate-400">{t('loginSubtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-sm text-slate-300">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              {...register('email')}
              className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-sm text-slate-300">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
              className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 h-10 w-full bg-indigo-600 font-semibold text-white hover:bg-indigo-500 focus-visible:ring-indigo-500"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : t('login')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t('noAccount')}{' '}
          <Link href={`/${locale}/register`} className="font-medium text-indigo-400 hover:text-indigo-300">
            {t('register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
