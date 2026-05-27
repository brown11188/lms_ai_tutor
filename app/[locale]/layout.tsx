import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { SessionProvider } from 'next-auth/react';
import { Geist } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as 'vi' | 'en')) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${geist.variable} h-full`}>
      <body className="h-full bg-background font-sans antialiased">
        <SessionProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
            <Toaster richColors position="top-right" />
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
