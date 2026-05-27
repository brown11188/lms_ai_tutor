import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { courses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).optional(),
  titleEn: z.string().optional(),
  description: z.string().min(1).optional(),
  descriptionEn: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  thumbnail: z.string().optional(),
  published: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const courseId = Number(id);

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      instructor: true,
      parts: {
        with: { lessons: true },
        orderBy: (p, { asc }) => [asc(p.order)],
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(course);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const courseId = Number(id);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const [updated] = await db
    .update(courses)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(courses.id, courseId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const courseId = Number(id);

  await db.delete(courses).where(eq(courses.id, courseId));

  return NextResponse.json({ ok: true });
}
