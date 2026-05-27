import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { courses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { courseId, locale = 'vi' } = body as { courseId: number; locale?: string };

  if (!courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 });
  }

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      parts: {
        with: { lessons: true },
        orderBy: (p, { asc }) => [asc(p.order)],
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  const courseTitle = locale === 'en' ? (course.titleEn ?? course.title) : course.title;
  const courseDesc =
    locale === 'en' ? (course.descriptionEn ?? course.description) : course.description;

  const partsContext = course.parts
    .sort((a, b) => a.order - b.order)
    .map((part) => {
      const partTitle = locale === 'en' ? (part.titleEn ?? part.title) : part.title;
      const lessonsText = part.lessons
        .sort((a, b) => a.order - b.order)
        .map((lesson) => {
          const lessonTitle =
            locale === 'en' ? (lesson.titleEn ?? lesson.title) : lesson.title;
          const content =
            locale === 'en' ? (lesson.contentEn ?? lesson.content) : lesson.content;
          return `  - ${lessonTitle}: ${content || '(no content)'}`;
        })
        .join('\n');
      return `Part: ${partTitle}\n${lessonsText}`;
    })
    .join('\n\n');

  const systemPrompt =
    locale === 'en'
      ? `You are an expert AI tutor. Summarize the following course content in English, organized by part. Be concise but comprehensive. Highlight the key learning objectives and takeaways for each part.`
      : `Bạn là gia sư AI chuyên nghiệp. Hãy tóm tắt nội dung khóa học sau bằng tiếng Việt, được tổ chức theo từng chương. Hãy ngắn gọn nhưng đầy đủ. Nêu bật các mục tiêu học tập và điểm chính của mỗi chương.`;

  const userMessage =
    locale === 'en'
      ? `Course: ${courseTitle}\nDescription: ${courseDesc}\n\nContent:\n${partsContext}`
      : `Khóa học: ${courseTitle}\nMô tả: ${courseDesc}\n\nNội dung:\n${partsContext}`;

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
