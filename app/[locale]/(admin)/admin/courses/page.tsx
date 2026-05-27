import { auth } from '@/auth';
import { db } from '@/db';
import { courses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { revalidatePath } from 'next/cache';

async function togglePublish(id: number, locale: string) {
  'use server';
  const course = await db.query.courses.findFirst({ where: eq(courses.id, id) });
  if (!course) return;
  await db
    .update(courses)
    .set({ published: !course.published })
    .where(eq(courses.id, id));
  revalidatePath(`/${locale}/admin/courses`);
}

async function deleteCourse(id: number, locale: string) {
  'use server';
  await db.delete(courses).where(eq(courses.id, id));
  revalidatePath(`/${locale}/admin/courses`);
}

export default async function AdminCoursesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') notFound();

  const t = await getTranslations('admin.courses');
  const tc = await getTranslations('courses');

  const allCourses = await db.query.courses.findMany({
    with: {
      instructor: true,
      parts: {
        with: { lessons: true },
      },
    },
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });

  const levelColor = (lv: string) => {
    if (lv === 'beginner') return 'bg-emerald-100 text-emerald-700';
    if (lv === 'intermediate') return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>
        <Link
          href={`/${locale}/admin/courses/new`}
          className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-500')}
        >
          <Plus size={16} />
          {t('new')}
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Title</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lessons</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allCourses.map((course) => {
              const lessonCount = course.parts.flatMap((p) => p.lessons).length;
              const toggleAction = togglePublish.bind(null, course.id, locale);
              const deleteAction = deleteCourse.bind(null, course.id, locale);
              return (
                <TableRow key={course.id}>
                  <TableCell className="font-medium text-slate-800 max-w-56 truncate">
                    {course.title}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${levelColor(course.level)}`}
                    >
                      {tc(course.level)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {course.published ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Draft
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">{lessonCount}</TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {course.instructor.name}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/${locale}/admin/courses/${course.id}/edit`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
                        title={t('edit')}
                      >
                        <Pencil size={14} />
                      </Link>
                      <form action={toggleAction}>
                        <button
                          type="submit"
                          title={course.published ? t('unpublish') : t('publish')}
                          className={cn(
                            buttonVariants({ variant: 'outline', size: 'icon-sm' }),
                            course.published
                              ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50',
                          )}
                        >
                          {course.published ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </form>
                      <form action={deleteAction}>
                        <button
                          type="submit"
                          title={t('delete')}
                          className={cn(
                            buttonVariants({ variant: 'destructive', size: 'icon-sm' }),
                          )}
                          onClick={(e) => {
                            if (!confirm('Delete this course?')) e.preventDefault();
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {allCourses.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">
            No courses yet. Create your first course.
          </div>
        )}
      </div>
    </div>
  );
}
