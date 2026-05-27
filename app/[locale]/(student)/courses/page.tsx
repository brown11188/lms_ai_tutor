import { auth } from '@/auth';
import { db } from '@/db';
import { courses, enrollments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen } from 'lucide-react';
import { Suspense } from 'react';
import { CourseSearch } from '@/features/course/CourseSearch';

type SearchParams = Promise<{ q?: string; level?: string }>;

export default async function CoursesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  const { q, level } = await searchParams;
  const session = await auth();
  const t = await getTranslations('courses');

  const userId = session?.user?.id ? Number(session.user.id) : null;

  const allCourses = await db.query.courses.findMany({
    where: eq(courses.published, true),
    with: {
      instructor: true,
      parts: {
        with: { lessons: true },
      },
      enrollments: true,
    },
  });

  const userEnrollmentIds = userId
    ? (
        await db
          .select({ courseId: enrollments.courseId })
          .from(enrollments)
          .where(eq(enrollments.userId, userId))
      ).map((e) => e.courseId)
    : [];

  const filtered = allCourses.filter((course) => {
    const title = locale === 'en' ? (course.titleEn ?? course.title) : course.title;
    const desc =
      locale === 'en' ? (course.descriptionEn ?? course.description) : course.description;

    const matchesQ = q
      ? title.toLowerCase().includes(q.toLowerCase()) ||
        desc.toLowerCase().includes(q.toLowerCase())
      : true;

    const matchesLevel = level && level !== 'all' ? course.level === level : true;

    return matchesQ && matchesLevel;
  });

  const levelBadgeColor = (lv: string) => {
    if (lv === 'beginner') return 'bg-emerald-100 text-emerald-700';
    if (lv === 'intermediate') return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>
        <p className="text-sm text-slate-500">
          {filtered.length} {filtered.length === 1 ? 'course' : 'courses'}
        </p>
      </div>

      <Suspense>
        <CourseSearch locale={locale} />
      </Suspense>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 py-16 text-slate-400">
          <BookOpen size={32} />
          <p>{t('search')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course) => {
            const title = locale === 'en' ? (course.titleEn ?? course.title) : course.title;
            const description =
              locale === 'en'
                ? (course.descriptionEn ?? course.description)
                : course.description;
            const lessonCount = course.parts.flatMap((p) => p.lessons).length;
            const enrolledCount = course.enrollments.length;
            const isEnrolled = userEnrollmentIds.includes(course.id);

            return (
              <Link
                key={course.id}
                href={`/${locale}/courses/${course.id}`}
                className="group flex flex-col rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md transition-all"
              >
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={title}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <BookOpen size={40} className="text-white/70" />
                  </div>
                )}

                <div className="flex flex-col flex-1 p-4 gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
                      {title}
                    </h2>
                    {isEnrolled && (
                      <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {t('enrolled')}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-500 line-clamp-2">{description}</p>

                  <div className="flex items-center gap-2 flex-wrap mt-auto">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${levelBadgeColor(course.level)}`}
                    >
                      {t(course.level)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <BookOpen size={12} />
                      {lessonCount} {t('lessons')}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Users size={12} />
                      {enrolledCount}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400">
                    {t('instructor')}: {course.instructor.name}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
