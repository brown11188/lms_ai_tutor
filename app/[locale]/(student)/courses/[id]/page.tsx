import { auth } from '@/auth';
import { db } from '@/db';
import { courses, enrollments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpen, Users, ChevronDown, Play } from 'lucide-react';

async function enrollAction(courseId: number, locale: string, userId: number) {
  'use server';
  await db.insert(enrollments).values({ userId, courseId }).onConflictDoNothing();
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      parts: {
        with: { lessons: true },
        orderBy: (p, { asc }) => [asc(p.order)],
      },
    },
  });
  const firstLesson = course?.parts[0]?.lessons.sort((a, b) => a.order - b.order)[0];
  if (firstLesson) {
    redirect(`/${locale}/courses/${courseId}/learn/${firstLesson.id}`);
  } else {
    redirect(`/${locale}/courses/${courseId}`);
  }
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await auth();
  const t = await getTranslations('courses');

  const courseId = Number(id);
  if (isNaN(courseId)) notFound();

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      instructor: true,
      parts: {
        with: { lessons: true },
        orderBy: (p, { asc }) => [asc(p.order)],
      },
      enrollments: true,
    },
  });

  if (!course || !course.published) notFound();

  const userId = session?.user?.id ? Number(session.user.id) : null;
  const isEnrolled = userId
    ? course.enrollments.some((e) => e.userId === userId)
    : false;

  const title = locale === 'en' ? (course.titleEn ?? course.title) : course.title;
  const description =
    locale === 'en' ? (course.descriptionEn ?? course.description) : course.description;

  const allLessons = course.parts.flatMap((p) =>
    p.lessons.sort((a, b) => a.order - b.order),
  );
  const totalLessons = allLessons.length;

  const levelColor =
    course.level === 'beginner'
      ? 'bg-emerald-100 text-emerald-700'
      : course.level === 'intermediate'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-rose-100 text-rose-700';

  const firstLesson = allLessons[0];

  const enrollWithData = enrollAction.bind(null, courseId, locale, userId ?? 0);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={title}
            className="w-full md:w-72 h-44 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="w-full md:w-72 h-44 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <BookOpen size={48} className="text-white/70" />
          </div>
        )}

        <div className="flex flex-col gap-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${levelColor}`}
            >
              {t(course.level)}
            </span>
            {isEnrolled && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                {t('enrolled')}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-slate-800 leading-snug">{title}</h1>
          <p className="text-slate-600 text-sm leading-relaxed">{description}</p>

          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <BookOpen size={14} />
              {totalLessons} {t('lessons')}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={14} />
              {course.enrollments.length} {t('enrolled')}
            </span>
          </div>

          <p className="text-sm text-slate-500">
            {t('instructor')}: <span className="font-medium text-slate-700">{course.instructor.name}</span>
          </p>

          <div className="mt-2">
            {isEnrolled ? (
              firstLesson ? (
                <Link
                  href={`/${locale}/courses/${course.id}/learn/${firstLesson.id}`}
                  className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-500')}
                >
                  <Play size={16} />
                  {t('continue')}
                </Link>
              ) : null
            ) : userId ? (
              <form action={enrollWithData}>
                <button
                  type="submit"
                  className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-500')}
                >
                  {t('enroll')}
                </button>
              </form>
            ) : (
              <Link
                href={`/${locale}/login`}
                className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-500')}
              >
                {t('enroll')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Course content */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">
          {course.parts.length} {t('parts')} · {totalLessons} {t('lessons')}
        </h2>

        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden">
          {course.parts.map((part) => {
            const partTitle = locale === 'en' ? (part.titleEn ?? part.title) : part.title;
            const sortedLessons = [...part.lessons].sort((a, b) => a.order - b.order);
            return (
              <details key={part.id} className="group bg-white">
                <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none hover:bg-slate-50 transition-colors">
                  <span className="font-medium text-slate-800 text-sm">{partTitle}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-500">
                      {sortedLessons.length} {t('lessons')}
                    </span>
                    <ChevronDown
                      size={16}
                      className="text-slate-400 transition-transform duration-200 group-open:rotate-180"
                    />
                  </div>
                </summary>
                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {sortedLessons.map((lesson) => {
                    const lessonTitle =
                      locale === 'en' ? (lesson.titleEn ?? lesson.title) : lesson.title;
                    const mins = lesson.durationSec > 0
                      ? `${Math.floor(lesson.durationSec / 60)}:${String(lesson.durationSec % 60).padStart(2, '0')}`
                      : null;
                    return (
                      <li
                        key={lesson.id}
                        className="flex items-center gap-3 px-5 py-2.5 text-sm"
                      >
                        <Play size={13} className="text-indigo-400 shrink-0" />
                        <span className="flex-1 text-slate-700">{lessonTitle}</span>
                        {mins && (
                          <span className="text-xs text-slate-400 shrink-0">{mins}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
