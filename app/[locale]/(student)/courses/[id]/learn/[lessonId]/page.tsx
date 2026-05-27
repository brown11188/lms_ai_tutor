import { auth } from '@/auth';
import { db } from '@/db';
import { courses, progresses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { LearnClient } from '@/features/lesson/LearnClient';

export default async function LearnPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; lessonId: string }>;
}) {
  const { locale, id, lessonId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const userId = Number(session!.user.id);
  const courseId = Number(id);
  const lessonIdNum = Number(lessonId);

  if (isNaN(courseId) || isNaN(lessonIdNum)) notFound();

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      parts: {
        with: {
          lessons: {
            with: {
              quiz: true,
              assignment: true,
            },
          },
        },
        orderBy: (p, { asc }) => [asc(p.order)],
      },
      enrollments: true,
    },
  });

  if (!course) notFound();

  const isEnrolled = course.enrollments.some((e) => e.userId === userId);
  if (!isEnrolled) {
    redirect(`/${locale}/courses/${courseId}`);
  }

  const allLessons = course.parts
    .flatMap((p) => p.lessons.map((l) => ({ ...l, partOrder: p.order })))
    .sort((a, b) => a.partOrder - b.partOrder || a.order - b.order);

  const lessonIndex = allLessons.findIndex((l) => l.id === lessonIdNum);
  if (lessonIndex === -1) notFound();

  const currentLesson = allLessons[lessonIndex];
  const prevLessonId = lessonIndex > 0 ? allLessons[lessonIndex - 1].id : null;
  const nextLessonId =
    lessonIndex < allLessons.length - 1 ? allLessons[lessonIndex + 1].id : null;

  const userProgress = await db.query.progresses.findFirst({
    where: and(
      eq(progresses.userId, userId),
      eq(progresses.lessonId, lessonIdNum),
    ),
  });

  const allParts = course.parts.map((p) => ({
    id: p.id,
    title: p.title,
    titleEn: p.titleEn,
    order: p.order,
    lessons: p.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      titleEn: l.titleEn,
      order: l.order,
    })),
  }));

  const lessonForClient = {
    id: currentLesson.id,
    title: currentLesson.title,
    titleEn: currentLesson.titleEn,
    content: currentLesson.content,
    contentEn: currentLesson.contentEn,
    youtubeId: currentLesson.youtubeId,
    durationSec: currentLesson.durationSec,
    partId: currentLesson.partId,
    order: currentLesson.order,
    quiz: currentLesson.quiz
      ? {
          id: currentLesson.quiz.id,
          questions: currentLesson.quiz.questions as {
            q: string;
            options: string[];
            correctIndex: number;
            explanation?: string;
          }[],
          passingScore: currentLesson.quiz.passingScore,
        }
      : null,
    assignment: currentLesson.assignment
      ? {
          id: currentLesson.assignment.id,
          title: currentLesson.assignment.title,
          description: currentLesson.assignment.description,
        }
      : null,
  };

  const progressForClient = userProgress
    ? {
        lastPositionSec: userProgress.lastPositionSec,
        completed: userProgress.completed,
      }
    : null;

  return (
    <LearnClient
      lesson={lessonForClient}
      allParts={allParts}
      progress={progressForClient}
      locale={locale}
      courseId={courseId}
      prevLessonId={prevLessonId}
      nextLessonId={nextLessonId}
    />
  );
}
