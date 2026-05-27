import { auth } from '@/auth';
import { db } from '@/db';
import { enrollments, progresses } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { BookOpen, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
        with: {
          parts: {
            with: { lessons: true },
          },
        },
      },
    },
  });

  const latestProgress = await db.query.progresses.findFirst({
    where: eq(progresses.userId, userId),
    orderBy: desc(progresses.updatedAt),
    with: {
      lesson: {
        with: {
          part: {
            with: { course: true },
          },
        },
      },
    },
  });

  const allLessons = userEnrollments.flatMap(e =>
    e.course.parts.flatMap(p => p.lessons)
  );
  const completedIds = (await db.select()
    .from(progresses)
    .where(and(eq(progresses.userId, userId), eq(progresses.completed, true)))
  ).map(p => p.lessonId);

  const completedCount = allLessons.filter(l => completedIds.includes(l.id)).length;

  const stats = [
    { label: t('enrolledCourses'), value: userEnrollments.length, icon: BookOpen, color: 'text-indigo-600' },
    { label: t('completedLessons'), value: completedCount, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: t('weeklyHours'), value: '0h', icon: Clock, color: 'text-amber-600' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-slate-200">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-xl bg-slate-50 p-3 ${color}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                <p className="text-sm text-slate-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Continue learning */}
      {latestProgress && (
        <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50 to-white">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-1">
                {t('continueLeaning')}
              </p>
              <p className="font-semibold text-slate-800">
                {locale === 'en'
                  ? latestProgress.lesson.titleEn ?? latestProgress.lesson.title
                  : latestProgress.lesson.title}
              </p>
              <p className="text-sm text-slate-500">
                {locale === 'en'
                  ? latestProgress.lesson.part.course.titleEn ?? latestProgress.lesson.part.course.title
                  : latestProgress.lesson.part.course.title}
              </p>
            </div>
            <Link
              href={`/${locale}/courses/${latestProgress.lesson.part.courseId}/learn/${latestProgress.lessonId}`}
              className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-500 shrink-0')}
            >
              {t('continueBtn')} →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Enrolled courses */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">{t('myCourses')}</h2>
        {userEnrollments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 py-12 text-slate-400">
            <TrendingUp size={32} />
            <p>{t('noEnrollment')}</p>
            <Link href={`/${locale}/courses`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              {t('browseCourses')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {userEnrollments.map(({ course }) => {
              const totalLessons = course.parts.flatMap(p => p.lessons).length;
              const done = course.parts.flatMap(p => p.lessons).filter(l => completedIds.includes(l.id)).length;
              const pct = totalLessons > 0 ? Math.round((done / totalLessons) * 100) : 0;
              const title = locale === 'en' ? course.titleEn ?? course.title : course.title;
              return (
                <Card key={course.id} className="border-slate-200 hover:border-indigo-200 transition-colors">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-800 leading-tight">{title}</p>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {tc(course.level)}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{done}/{totalLessons} {tc('lessons')}</span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                    <Link
                      href={`/${locale}/courses/${course.id}`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50')}
                    >
                      {tc('continue')}
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
