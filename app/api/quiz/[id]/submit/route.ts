import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { quizzes, quizAttempts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const schema = z.object({
  answers: z.array(z.number().int().min(0)),
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
  const quizId = Number(id);
  if (isNaN(quizId)) {
    return NextResponse.json({ error: 'Invalid quiz id' }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { answers } = parsed.data;

  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId),
  });

  if (!quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  const questions = quiz.questions as { q: string; options: string[]; correctIndex: number }[];
  const correctAnswers = questions.map((q) => q.correctIndex);

  let correct = 0;
  for (let i = 0; i < questions.length; i++) {
    if (answers[i] === correctAnswers[i]) correct++;
  }

  const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
  const passed = score >= quiz.passingScore;

  await db.insert(quizAttempts).values({
    userId,
    quizId,
    score,
    answers,
  });

  return NextResponse.json({ score, passed, correctAnswers });
}
