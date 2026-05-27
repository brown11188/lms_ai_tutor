import { auth } from '@/auth';
import { db } from '@/db';
import { courses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BookOpen, Users, ChevronDown, Play, Lock,
  Clock, BarChart2, CheckCircle2, Award,
} from 'lucide-react';
import { EnrollButton } from '@/features/course/EnrollButton';

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
  const totalDuration = allLessons.reduce((acc, l) => acc + (l.durationSec || 0), 0);
  const totalHours = totalDuration > 0
    ? `${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}m`
    : null;

  const levelInfo = {
    beginner:     { label: t('beginner'),     cls: 'bg-emerald-100 text-emerald-700' },
    intermediate: { label: t('intermediate'), cls: 'bg-orange-100 text-orange-700'  },
    advanced:     { label: t('advanced'),     cls: 'bg-rose-100 text-rose-700'      },
  }[course.level] ?? { label: course.level, cls: 'bg-slate-100 text-slate-700' };

  const firstLesson = allLessons[0];

  return (
    <div className="min-h-full">
      {/* ── Dark hero section (Udemy-style) ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #060c18 0%, #0f1c30 100%)' }}
      >
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-8 items-start">
          {/* Left: course info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${levelInfo.cls}`}>
                {levelInfo.label}
              </span>
              {isEnrolled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-semibold text-orange-400 border border-orange-500/20">
                  <CheckCircle2 size={11} />
                  {t('enrolled')}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-3">
              {title}
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-2xl">
              {description}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap gap-5 text-sm text-slate-400 mb-6">
              <span className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-orange-400" />
                {totalLessons} {t('lessons')}
              </span>
              {totalHours && (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-orange-400" />
                  {totalHours}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-orange-400" />
                {course.enrollments.length} {t('enrolled')}
              </span>
              <span className="flex items-center gap-1.5">
                <BarChart2 size={14} className="text-orange-400" />
                {levelInfo.label}
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-6">
              {t('instructor')}:{' '}
              <span className="text-slate-300 font-medium">{course.instructor.name}</span>
            </p>

            {/* CTA */}
            <div className="flex flex-wrap gap-3">
              {isEnrolled ? (
                firstLesson ? (
                  <Link
                    href={`/${locale}/courses/${course.id}/learn/${firstLesson.id}`}
                    className={cn(
                      buttonVariants(),
                      'bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 h-11 rounded-lg shadow-lg shadow-orange-500/20',
                    )}
                  >
                    <Play size={16} fill="currentColor" />
                    {t('continue')}
                  </Link>
                ) : null
              ) : userId ? (
                <EnrollButton
                  courseId={course.id}
                  locale={locale}
                  firstLessonId={firstLesson?.id ?? null}
                />
              ) : (
                <Link
                  href={`/${locale}/login`}
                  className={cn(
                    buttonVariants(),
                    'bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 h-11 rounded-lg',
                  )}
                >
                  {t('enroll')}
                </Link>
              )}
            </div>
          </div>

          {/* Right: thumbnail */}
          {course.thumbnail && (
            <div className="shrink-0 md:w-72 rounded-xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">
              <img
                src={course.thumbnail}
                alt={title}
                className="w-full aspect-video object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Course content ── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-4">
          <Award size={18} className="text-orange-500" />
          <h2 className="text-lg font-bold text-slate-800">
            {course.parts.length} {t('parts')} · {totalLessons} {t('lessons')}
          </h2>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          {course.parts.map((part, partIndex) => {
            const partTitle = locale === 'en' ? (part.titleEn ?? part.title) : part.title;
            const sortedLessons = [...part.lessons].sort((a, b) => a.order - b.order);

            return (
              <details
                key={part.id}
                open={partIndex === 0}
                className="group border-b border-slate-100 last:border-b-0"
              >
                <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer select-none hover:bg-orange-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #f97316, #ea6c0a)' }}
                    >
                      {partIndex + 1}
                    </span>
                    <span className="font-semibold text-slate-800 text-sm">{partTitle}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400">
                      {sortedLessons.length} {t('lessons')}
                    </span>
                    <ChevronDown
                      size={16}
                      className="text-slate-400 transition-transform duration-200 group-open:rotate-180"
                    />
                  </div>
                </summary>

                <ul className="divide-y divide-slate-50 border-t border-slate-100">
                  {sortedLessons.map((lesson) => {
                    const lessonTitle =
                      locale === 'en' ? (lesson.titleEn ?? lesson.title) : lesson.title;
                    const mins =
                      lesson.durationSec > 0
                        ? `${Math.floor(lesson.durationSec / 60)}:${String(lesson.durationSec % 60).padStart(2, '0')}`
                        : null;
                    const lessonHref = `/${locale}/courses/${course.id}/learn/${lesson.id}`;

                    return (
                      <li key={lesson.id}>
                        {isEnrolled ? (
                          <Link
                            href={lessonHref}
                            className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-orange-50 transition-colors group/lesson"
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 group-hover/lesson:bg-orange-500 group-hover/lesson:border-orange-500 transition-colors">
                              <Play size={10} className="text-orange-500 group-hover/lesson:text-white transition-colors ml-0.5" fill="currentColor" />
                            </div>
                            <span className="flex-1 text-slate-700 group-hover/lesson:text-orange-700 transition-colors">
                              {lessonTitle}
                            </span>
                            {mins && (
                              <span className="text-xs text-slate-400 shrink-0">{mins}</span>
                            )}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 px-5 py-3 text-sm">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                              <Lock size={10} className="text-slate-400" />
                            </div>
                            <span className="flex-1 text-slate-500">{lessonTitle}</span>
                            {mins && (
                              <span className="text-xs text-slate-400 shrink-0">{mins}</span>
                            )}
                          </div>
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
