import { auth } from '@/auth';
import { db } from '@/db';
import { submissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, Award } from 'lucide-react';

export default async function AdminSubmissionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') notFound();

  const allSubmissions = await db.query.submissions.findMany({
    with: {
      user: true,
      assignment: true,
    },
    orderBy: (s, { desc }) => [desc(s.submittedAt)],
  });

  const statusBadge = (status: string) => {
    if (status === 'GRADED')
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 size={11} />
          Graded
        </span>
      );
    if (status === 'SUBMITTED')
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          <Clock size={11} />
          Submitted
        </span>
      );
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        Pending
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800">Submissions</h1>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Student</TableHead>
              <TableHead>Assignment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allSubmissions.map((sub) => {
              return (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium text-slate-800">{sub.user.name}</TableCell>
                  <TableCell className="text-slate-700 text-sm max-w-48 truncate">
                    {sub.assignment.title}
                  </TableCell>
                  <TableCell>{statusBadge(sub.status)}</TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {sub.submittedAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {sub.grade !== null ? (
                      <span className="flex items-center gap-1 text-sm font-medium text-emerald-700">
                        <Award size={13} />
                        {sub.grade}/100
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {sub.status === 'SUBMITTED' && (
                      <GradeForm submissionId={sub.id} locale={locale} content={sub.content} />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {allSubmissions.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">
            No submissions yet.
          </div>
        )}
      </div>
    </div>
  );
}

function GradeForm({
  submissionId,
  locale,
  content,
}: {
  submissionId: number;
  locale: string;
  content: string;
}) {
  const action = async (formData: FormData) => {
    'use server';
    const grade = Number(formData.get('grade'));
    const feedback = String(formData.get('feedback') ?? '');
    await db
      .update(submissions)
      .set({ grade, feedback, status: 'GRADED', gradedAt: new Date() })
      .where(eq(submissions.id, submissionId));
    revalidatePath(`/${locale}/admin/submissions`);
  };

  return (
    <form action={action} className="flex flex-col gap-2 min-w-56">
      <details className="mb-1">
        <summary className="text-xs text-indigo-600 cursor-pointer hover:text-indigo-800">
          View submission
        </summary>
        <pre className="mt-1 whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 rounded p-2 border border-slate-200 max-h-24 overflow-y-auto">
          {content}
        </pre>
      </details>
      <div className="flex gap-2 items-center">
        <input
          name="grade"
          type="number"
          min={0}
          max={100}
          defaultValue={0}
          className="w-20 h-7 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
          placeholder="0-100"
          required
        />
        <span className="text-xs text-slate-500">/100</span>
      </div>
      <textarea
        name="feedback"
        placeholder="Feedback (optional)"
        className="min-h-12 w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring"
      />
      <button
        type="submit"
        className={cn(buttonVariants({ size: 'xs' }), 'bg-indigo-600 hover:bg-indigo-500 w-fit')}
      >
        Grade
      </button>
    </form>
  );
}
