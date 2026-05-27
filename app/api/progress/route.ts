import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { progresses } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

const schema = z.object({
  lessonId: z.number().int().positive(),
  lastPositionSec: z.number().int().min(0),
  completed: z.boolean(),
});

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

  const { lessonId, lastPositionSec, completed } = parsed.data;

  await db
    .insert(progresses)
    .values({ userId, lessonId, lastPositionSec, completed })
    .onConflictDoUpdate({
      target: [progresses.userId, progresses.lessonId],
      set: {
        lastPositionSec: sql`excluded.last_position_sec`,
        completed: sql`excluded.completed`,
        updatedAt: sql`now()`,
      },
    });

  return NextResponse.json({ ok: true });
}
