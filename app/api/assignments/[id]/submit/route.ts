import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { submissions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const schema = z.object({
  content: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const { id } = await params;
  const assignmentId = Number(id);
  if (isNaN(assignmentId)) {
    return NextResponse.json({ error: 'Invalid assignment id' }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { content } = parsed.data;

  const existing = await db.query.submissions.findFirst({
    where: and(
      eq(submissions.assignmentId, assignmentId),
      eq(submissions.userId, userId),
    ),
  });

  if (existing) {
    await db
      .update(submissions)
      .set({ content, status: 'SUBMITTED', submittedAt: new Date() })
      .where(eq(submissions.id, existing.id));
  } else {
    await db.insert(submissions).values({ assignmentId, userId, content, status: 'SUBMITTED' });
  }

  return NextResponse.json({ ok: true });
}
