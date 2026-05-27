import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { lessons } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).optional(),
  titleEn: z.string().optional().nullable(),
  youtubeId: z.string().min(1).optional(),
  content: z.string().optional(),
  contentEn: z.string().optional().nullable(),
  order: z.number().int().min(1).optional(),
  durationSec: z.number().int().min(0).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const lessonId = Number(id);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const [updated] = await db
    .update(lessons)
    .set(parsed.data)
    .where(eq(lessons.id, lessonId))
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
  const lessonId = Number(id);

  await db.delete(lessons).where(eq(lessons.id, lessonId));

  return NextResponse.json({ ok: true });
}
