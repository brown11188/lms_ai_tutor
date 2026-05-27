import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { courses } from '@/db/schema';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1),
  titleEn: z.string().optional(),
  description: z.string().min(1),
  descriptionEn: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  thumbnail: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const all = await db.query.courses.findMany({
    with: {
      instructor: true,
      parts: { with: { lessons: true } },
    },
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });

  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const instructorId = Number(session.user.id);

  const [created] = await db
    .insert(courses)
    .values({
      ...parsed.data,
      instructorId,
      published: false,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
