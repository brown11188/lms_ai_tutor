import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { aiChats, courses, enrollments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage } from '@/db/schema';

const anthropic = new Anthropic();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);

  const userEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.userId, userId),
    with: {
      course: true,
    },
  });

  const enrolledCourses = userEnrollments.map((e) => ({
    id: e.course.id,
    title: e.course.title,
    titleEn: e.course.titleEn,
  }));

  const existingChat = await db.query.aiChats.findFirst({
    where: eq(aiChats.userId, userId),
    orderBy: (c, { desc }) => [desc(c.updatedAt)],
  });

  return NextResponse.json({
    courses: enrolledCourses,
    messages: existingChat?.messages ?? [],
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const body = await req.json();
  const { messages, courseId } = body as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    courseId?: number | null;
  };

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'Messages required' }, { status: 400 });
  }

  let systemPrompt =
    'You are a helpful AI tutor for an online learning platform. Help students understand concepts, answer questions, and guide their learning journey. Be encouraging and clear.';

  if (courseId) {
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      with: {
        parts: {
          with: { lessons: true },
          orderBy: (p, { asc }) => [asc(p.order)],
        },
      },
    });

    if (course) {
      const locale = session.user.locale ?? 'vi';
      const courseTitle = locale === 'en' ? (course.titleEn ?? course.title) : course.title;
      const partsText = course.parts
        .sort((a, b) => a.order - b.order)
        .map((part) => {
          const partTitle = locale === 'en' ? (part.titleEn ?? part.title) : part.title;
          const lessonTitles = part.lessons
            .sort((a, b) => a.order - b.order)
            .map((l) => (locale === 'en' ? l.titleEn ?? l.title : l.title))
            .join(', ');
          return `${partTitle}: ${lessonTitles}`;
        })
        .join('\n');

      systemPrompt = `You are an expert AI tutor for the course "${courseTitle}". The course covers the following topics:\n${partsText}\n\nHelp students understand the course material, answer questions related to the topics, and guide their learning. Be helpful, clear, and encouraging.`;
    }
  }

  const anthropicMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    system: systemPrompt,
    messages: anthropicMessages,
  });

  const encoder = new TextEncoder();
  let fullContent = '';

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          fullContent += chunk.delta.text;
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();

      const now = new Date().toISOString();
      const newMessages: ChatMessage[] = [
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          createdAt: now,
        })),
        { role: 'assistant', content: fullContent, createdAt: now },
      ];

      const existingChat = await db.query.aiChats.findFirst({
        where: eq(aiChats.userId, userId),
        orderBy: (c, { desc }) => [desc(c.updatedAt)],
      });

      if (existingChat) {
        await db
          .update(aiChats)
          .set({ messages: newMessages, updatedAt: new Date() })
          .where(eq(aiChats.id, existingChat.id))
          .catch(() => {});
      } else {
        await db
          .insert(aiChats)
          .values({ userId, courseId: courseId ?? null, messages: newMessages })
          .catch(() => {});
      }
    },
  });

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
