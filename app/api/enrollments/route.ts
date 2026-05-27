import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { enrollments, courses, parts, lessons } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const schema = z.object({ courseId: z.number().int().positive() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = Number(session.user.id);
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const { courseId } = parsed.data;

  await db.insert(enrollments).values({ userId, courseId }).onConflictDoNothing();

  // Return first lesson id so client can redirect
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      parts: {
        with: { lessons: true },
        orderBy: (p, { asc }) => [asc(p.order)],
      },
    },
  });

  const firstLesson = course?.parts
    .flatMap(p => p.lessons.sort((a, b) => a.order - b.order))[0];

  return NextResponse.json({ ok: true, firstLessonId: firstLesson?.id ?? null });
}
