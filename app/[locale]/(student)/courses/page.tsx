import { auth } from '@/auth';
import { db } from '@/db';
import { courses, enrollments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Users, BookOpen, Star, CheckCircle2 } from 'lucide-react';
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
      parts: { with: { lessons: true } },
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

  const levelLabel = (lv: string) => {
    if (lv === 'beginner') return { label: t('beginner'), cls: 'bg-emerald-100 text-emerald-700' };
    if (lv === 'intermediate') return { label: t('intermediate'), cls: 'bg-orange-100 text-orange-700' };
    return { label: t('advanced'), cls: 'bg-rose-100 text-rose-700' };
  };

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div
        className="px-6 py-8"
        style={{
          background: 'linear-gradient(135deg, #060c18 0%, #0f1c30 100%)',
        }}
      >
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1">{t('title')}</h1>
          <p className="text-slate-400 text-sm">
            {filtered.length} {filtered.length === 1 ? 'course' : 'courses'} available
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <Suspense>
            <CourseSearch locale={locale} />
          </Suspense>
        </div>
      </div>

      {/* Course grid */}
      <div className="p-6 max-w-6xl mx-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 py-20 text-slate-400 mt-4">
            <BookOpen size={36} className="text-slate-300" />
            <p className="text-sm font-medium">{t('search')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-2">
            {filtered.map((course) => {
              const title = locale === 'en' ? (course.titleEn ?? course.title) : course.title;
              const description =
                locale === 'en'
                  ? (course.descriptionEn ?? course.description)
                  : course.description;
              const lessonCount = course.parts.flatMap((p) => p.lessons).length;
              const enrolledCount = course.enrollments.length;
              const isEnrolled = userEnrollmentIds.includes(course.id);
              const { label: lvLabel, cls: lvCls } = levelLabel(course.level);

              return (
                <Link
                  key={course.id}
                  href={`/${locale}/courses/${course.id}`}
                  className="card-hover group flex flex-col rounded-xl overflow-hidden bg-white border border-slate-200 hover:border-orange-300"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                  {/* Thumbnail */}
                  <div className="relative overflow-hidden h-44">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #0f1c30, #1e3050)' }}
                      >
                        <BookOpen size={40} className="text-white/30" />
                      </div>
                    )}
                    {/* Orange top border on hover */}
                    <div
                      className="absolute top-0 inset-x-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: 'linear-gradient(90deg, #f97316, #fb923c)' }}
                    />
                    {isEnrolled && (
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
                        <CheckCircle2 size={11} />
                        {t('enrolled')}
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-4 gap-2.5">
                    <span className={`self-start inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${lvCls}`}>
                      {lvLabel}
                    </span>

                    <h2 className="font-bold text-slate-800 leading-snug line-clamp-2 text-[15px] group-hover:text-orange-600 transition-colors">
                      {title}
                    </h2>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {description}
                    </p>

                    <div className="flex items-center gap-3 mt-auto pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <BookOpen size={12} className="text-slate-400" />
                        {lessonCount} {t('lessons')}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Users size={12} className="text-slate-400" />
                        {enrolledCount}
                      </span>
                      <span className="ml-auto text-xs text-slate-400 truncate">
                        {course.instructor.name}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
