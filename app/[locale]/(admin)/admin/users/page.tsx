import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Trash2, ShieldCheck, User } from 'lucide-react';

async function changeRole(userId: number, newRole: 'ADMIN' | 'STUDENT', locale: string) {
  'use server';
  await db.update(users).set({ role: newRole }).where(eq(users.id, userId));
  revalidatePath(`/${locale}/admin/users`);
}

async function deleteUser(userId: number, locale: string) {
  'use server';
  await db.delete(users).where(eq(users.id, userId));
  revalidatePath(`/${locale}/admin/users`);
}

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') notFound();

  const t = await getTranslations('admin.users');

  const allUsers = await db.query.users.findMany({
    with: { enrollments: true },
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });

  const currentUserId = Number(session.user.id);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Enrolled Courses</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allUsers.map((user) => {
              const isSelf = user.id === currentUserId;
              const toggleRoleAction = changeRole.bind(
                null,
                user.id,
                user.role === 'ADMIN' ? 'STUDENT' : 'ADMIN',
                locale,
              );
              const deleteAction = deleteUser.bind(null, user.id, locale);

              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-slate-800">{user.name}</TableCell>
                  <TableCell className="text-slate-600 text-sm">{user.email}</TableCell>
                  <TableCell>
                    {user.role === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        <ShieldCheck size={11} />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        <User size={11} />
                        Student
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">{user.enrollments.length}</TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {user.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isSelf && (
                      <div className="flex items-center justify-end gap-2">
                        <form action={toggleRoleAction}>
                          <button
                            type="submit"
                            className={cn(
                              buttonVariants({ variant: 'outline', size: 'xs' }),
                              user.role === 'ADMIN'
                                ? 'border-slate-200 text-slate-600'
                                : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50',
                            )}
                            title={t('changeRole')}
                          >
                            {user.role === 'ADMIN' ? 'Make Student' : 'Make Admin'}
                          </button>
                        </form>
                        <form action={deleteAction}>
                          <button
                            type="submit"
                            className={cn(
                              buttonVariants({ variant: 'destructive', size: 'icon-xs' }),
                            )}
                            onClick={(e) => {
                              if (!confirm('Delete this user?')) e.preventDefault();
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </form>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {allUsers.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">No users found.</div>
        )}
      </div>
    </div>
  );
}
