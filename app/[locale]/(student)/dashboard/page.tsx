import { auth } from '@/auth';
import { db } from '@/db';
import { enrollments, progresses } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { BookOpen, CheckCircle2, Clock, TrendingUp, Play, ChevronRight, Flame } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const t = await getTranslations('dashboard');
  const tc = await getTranslations('courses');

  const userId = Number(session?.user?.id);
  if (!userId) return null;

  const userEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.userId, userId),
    with: {
      course: {
        with: { parts: { with: { lessons: true } } },
      },
    },
  });

  const latestProgress = await db.query.progresses.findFirst({
    where: eq(progresses.userId, userId),
    orderBy: desc(progresses.updatedAt),
    with: {
      lesson: { with: { part: { with: { course: true } } } },
    },
  });

  const allLessons = userEnrollments.flatMap((e) => e.course.parts.flatMap((p) => p.lessons));
  const completedIds = (
    await db.select().from(progresses)
      .where(and(eq(progresses.userId, userId), eq(progresses.completed, true)))
  ).map((p) => p.lessonId);

  const completedCount = allLessons.filter((l) => completedIds.includes(l.id)).length;
  const firstName = session?.user?.name?.split(' ')[0] ?? 'there';

  const stats = [
    { label: t('enrolledCourses'), value: userEnrollments.length, icon: BookOpen,     color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
    { label: t('completedLessons'), value: completedCount,         icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
    { label: t('weeklyHours'),      value: '0h',                   icon: Clock,        color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
  ];

  return (
    <div className="min-h-full">
      {/* Hero header */}
      <div
        className="px-6 py-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #060c18 0%, #0f1c30 100%)' }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #fff 0, #fff 1px, transparent 1px, transparent 40px)',
          }}
        />
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={18} className="text-orange-400" />
            <span className="text-orange-400 text-sm font-semibold">Welcome back</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            {t('title')}, {firstName}! 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">Continue your learning journey</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-7 space-y-7">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="flex items-center gap-4 p-5 rounded-xl bg-white border border-slate-100"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
            >
              <div className="rounded-xl p-3" style={{ background: bg }}>
                <Icon size={22} style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Continue learning banner */}
        {latestProgress && (
          <div
            className="relative overflow-hidden rounded-xl p-5"
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea6c0a 100%)',
              boxShadow: '0 6px 24px rgba(249,115,22,0.3)',
            }}
          >
            {/* Decorative circle */}
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -right-4 -bottom-10 w-24 h-24 rounded-full bg-white/8" />

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
                  {t('continueLeaning')}
                </p>
                <p className="font-bold text-white text-lg leading-tight">
                  {locale === 'en'
                    ? latestProgress.lesson.titleEn ?? latestProgress.lesson.title
                    : latestProgress.lesson.title}
                </p>
                <p className="text-white/70 text-sm mt-0.5">
                  {locale === 'en'
                    ? latestProgress.lesson.part.course.titleEn ?? latestProgress.lesson.part.course.title
                    : latestProgress.lesson.part.course.title}
                </p>
              </div>
              <Link
                href={`/${locale}/courses/${latestProgress.lesson.part.courseId}/learn/${latestProgress.lessonId}`}
                className="inline-flex items-center gap-2 shrink-0 px-5 h-10 rounded-lg bg-white text-orange-600 text-sm font-bold hover:bg-orange-50 transition-colors shadow-lg"
              >
                <Play size={14} fill="currentColor" />
                {t('continueBtn')}
              </Link>
            </div>
          </div>
        )}

        {/* My courses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">{t('myCourses')}</h2>
            <Link
              href={`/${locale}/courses`}
              className="flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
            >
              Browse all
              <ChevronRight size={14} />
            </Link>
          </div>

          {userEnrollments.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-slate-400">
              <TrendingUp size={36} className="text-slate-300" />
              <p className="text-sm font-medium">{t('noEnrollment')}</p>
              <Link
                href={`/${locale}/courses`}
                className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
              >
                {t('browseCourses')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userEnrollments.map(({ course }) => {
                const totalLessons = course.parts.flatMap((p) => p.lessons).length;
                const done = course.parts.flatMap((p) => p.lessons).filter((l) => completedIds.includes(l.id)).length;
                const pct = totalLessons > 0 ? Math.round((done / totalLessons) * 100) : 0;
                const title = locale === 'en' ? (course.titleEn ?? course.title) : course.title;

                return (
                  <div
                    key={course.id}
                    className="rounded-xl bg-white border border-slate-100 p-5 space-y-3 hover:border-orange-200 transition-colors"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-800 leading-tight text-sm">{title}</p>
                      <span className="shrink-0 text-xs font-semibold text-orange-500 bg-orange-50 rounded-full px-2 py-0.5">
                        {pct}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                        <span>{done}/{totalLessons} {tc('lessons')}</span>
                        {pct === 100 && (
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                            <CheckCircle2 size={11} />
                            Complete
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: pct === 100
                              ? '#10b981'
                              : 'linear-gradient(90deg, #f97316, #fb923c)',
                          }}
                        />
                      </div>
                    </div>

                    <Link
                      href={`/${locale}/courses/${course.id}`}
                      className="flex items-center justify-center gap-2 w-full h-8 rounded-lg border border-orange-200 text-orange-600 text-xs font-semibold hover:bg-orange-50 transition-colors"
                    >
                      <Play size={11} fill="currentColor" />
                      {tc('continue')}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
