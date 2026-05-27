import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { parts } from '@/db/schema';
import { z } from 'zod';

const schema = z.object({
  courseId: z.number().int().positive(),
  title: z.string().min(1),
  titleEn: z.string().optional(),
  order: z.number().int().min(1),
});

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

  const [created] = await db.insert(parts).values(parsed.data).returning();

  return NextResponse.json(created, { status: 201 });
}
