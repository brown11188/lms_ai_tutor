'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import {
  LayoutDashboard,
  BookOpen,
  Settings2,
  Users,
  Bot,
  ChevronRight,
  LogOut,
  User,
  Menu,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type NavItem = {
  key: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard',     href: '/dashboard',      icon: LayoutDashboard },
  { key: 'courses',       href: '/courses',         icon: BookOpen },
  { key: 'manageCourses', href: '/admin/courses',   icon: Settings2, adminOnly: true },
  { key: 'manageUsers',   href: '/admin/users',     icon: Users,     adminOnly: true },
  { key: 'aiSupport',     href: '/ai',              icon: Bot },
];

function SidebarContent({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle?: () => void;
}) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const isActive = (href: string) =>
    pathname === `/${locale}${href}` ||
    pathname.startsWith(`/${locale}${href}/`);

  const items = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  const initials = session?.user?.name
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  const otherLocale = locale === 'vi' ? 'en' : 'vi';
  const redirectPath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  return (
    <div
      className={cn(
        'flex h-full flex-col transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
      )}
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #0c1322 100%)',
        borderRight: '1px solid rgba(99,102,241,0.12)',
      }}
    >
      {/* Logo + toggle */}
      <div
        className="flex h-16 items-center justify-between px-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className={cn('flex items-center gap-2.5 overflow-hidden transition-all duration-300', collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100')}>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 0 12px rgba(99,102,241,0.5)' }}
          >
            <Bot size={16} className="text-white" />
          </div>
          <span className="whitespace-nowrap text-sm font-semibold tracking-wide text-slate-100">
            LMS AI Tutor
          </span>
        </div>

        <button
          onClick={onToggle}
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          <ChevronRight
            size={16}
            className={cn('transition-transform duration-300', !collapsed && 'rotate-180')}
          />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        <ul className="flex flex-col gap-1">
          {items.map(({ key, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={key}>
                <Link
                  href={`/${locale}${href}`}
                  className={cn(
                    'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200',
                    active ? 'text-white' : 'text-slate-400 hover:text-slate-100',
                  )}
                  style={active ? {
                    background: 'linear-gradient(90deg, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.06) 100%)',
                    boxShadow: 'inset 2px 0 0 #6366f1',
                  } : undefined}
                >
                  {!active && (
                    <span className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    />
                  )}
                  <Icon
                    size={18}
                    className={cn(
                      'shrink-0 transition-colors duration-200',
                      active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300',
                    )}
                  />
                  <span className={cn('whitespace-nowrap transition-all duration-300', collapsed ? 'w-0 overflow-hidden opacity-0' : 'w-auto opacity-100')}>
                    {t(key)}
                  </span>
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 shadow-xl group-hover:block z-50">
                      {t(key)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: lang toggle + avatar */}
      <div
        className="shrink-0 px-2 pb-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Language toggle */}
        <div className={cn('my-3 flex items-center transition-all duration-300', collapsed ? 'justify-center' : 'justify-start px-1')}>
          <Link
            href={redirectPath}
            className="flex h-7 items-center rounded-full border border-slate-700 bg-slate-800/60 px-2 text-xs font-semibold tracking-widest text-slate-300 transition-all hover:border-indigo-500/50 hover:text-indigo-300 hover:bg-slate-800"
          >
            {collapsed ? (locale === 'vi' ? 'VI' : 'EN') : (
              <span>
                <span className="text-indigo-400">{locale.toUpperCase()}</span>
                <span className="mx-1 text-slate-600">/</span>
                <span>{otherLocale.toUpperCase()}</span>
              </span>
            )}
          </Link>
        </div>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                className={cn(
                  'group flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-all duration-200 hover:bg-slate-800/60',
                  collapsed && 'justify-center px-0',
                )}
              />
            }
          >
            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-indigo-500/30 transition-all group-hover:ring-indigo-500/60">
              <AvatarFallback className="bg-indigo-900 text-xs font-bold text-indigo-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className={cn('flex min-w-0 flex-col text-left transition-all duration-300', collapsed ? 'w-0 overflow-hidden opacity-0' : 'flex-1 opacity-100')}>
              <span className="truncate text-xs font-semibold text-slate-200">
                {session?.user?.name}
              </span>
              <span className="truncate text-[10px] text-slate-500">
                {session?.user?.email}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            className="w-52 border-slate-700 bg-slate-900 text-slate-200"
          >
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2 text-slate-300 hover:text-white focus:text-white focus:bg-slate-800"
              onClick={() => router.push(`/${locale}/profile`)}
            >
              <User size={14} />
              <span>{t('profile')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2 text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-slate-800"
              onClick={() => signOut({ redirectTo: `/${locale}/login` })}
            >
              <LogOut size={14} />
              <span>{t('logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className="hidden lg:flex shrink-0">
      <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button className="flex lg:hidden h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" />
        }
      >
        <Menu size={20} />
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0 border-0">
        <SidebarContent collapsed={false} onToggle={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
