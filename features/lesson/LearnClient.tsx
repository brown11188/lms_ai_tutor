'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import YouTube from 'react-youtube';
import type { YouTubePlayer } from 'react-youtube';
import {
  CheckCircle2, ChevronLeft, ChevronRight, ChevronDown,
  Menu, X, BookOpen, Play, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/* ── Types ── */
type QuizQuestion = {
  q: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};
type Quiz       = { id: number; questions: QuizQuestion[]; passingScore: number };
type Assignment = { id: number; title: string; description: string };
type Lesson = {
  id: number; title: string; titleEn?: string | null;
  content: string; contentEn?: string | null;
  youtubeId: string; durationSec: number;
  partId: number; order: number;
  quiz?: Quiz | null; assignment?: Assignment | null;
};
type LessonMini = { id: number; title: string; titleEn?: string | null; order: number };
type Part = { id: number; title: string; titleEn?: string | null; order: number; lessons: LessonMini[] };
type Props = {
  lesson: Lesson; allParts: Part[];
  progress: { lastPositionSec: number; completed: boolean } | null;
  locale: string; courseId: number;
  prevLessonId: number | null; nextLessonId: number | null;
};

/* ─────────────────────────────────────────── */
export function LearnClient({ lesson, allParts, progress, locale, courseId, prevLessonId, nextLessonId }: Props) {
  const t = useTranslations('lesson');
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completed, setCompleted] = useState(progress?.completed ?? false);

  const playerRef = useRef<YouTubePlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Progress tracking ── */
  const postProgress = useCallback(async (lastPositionSec: number, isCompleted: boolean) => {
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, lastPositionSec, completed: isCompleted }),
    });
  }, [lesson.id]);

  const startTracking = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      const player = playerRef.current;
      if (!player) return;
      try {
        const currentTime: number = await player.getCurrentTime();
        const duration: number = lesson.durationSec || (await player.getDuration());
        const isNowCompleted = duration > 0 && currentTime / duration >= 0.9;
        if (isNowCompleted && !completed) {
          setCompleted(true);
          await postProgress(Math.floor(currentTime), true);
        } else {
          await postProgress(Math.floor(currentTime), completed);
        }
      } catch { /* ignore */ }
    }, 5000);
  }, [lesson.durationSec, completed, postProgress]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => () => stopTracking(), [stopTracking]);

  const onPlayerStateChange = (event: { data: number; target: YouTubePlayer }) => {
    playerRef.current = event.target;
    if (event.data === 1) startTracking(); else stopTracking();
  };

  const sortedParts = [...allParts].sort((a, b) => a.order - b.order);
  const lessonTitle   = locale === 'en' ? (lesson.titleEn   ?? lesson.title)   : lesson.title;
  const lessonContent = locale === 'en' ? (lesson.contentEn ?? lesson.content) : lesson.content;

  /* ── Sidebar lesson list ── */
  const [expandedParts, setExpandedParts] = useState<Set<number>>(
    () => new Set(sortedParts.map((p) => p.id))
  );
  const togglePart = (id: number) =>
    setExpandedParts((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const SidebarInner = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="shrink-0 px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#060c18' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen size={14} className="text-orange-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-300 truncate">Course Content</span>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded hover:bg-white/10">
          <X size={15} className="text-slate-400" />
        </button>
      </div>

      {/* Lesson list */}
      <div className="flex-1 overflow-y-auto" style={{ background: '#0a1220' }}>
        {sortedParts.map((part) => {
          const partTitle = locale === 'en' ? (part.titleEn ?? part.title) : part.title;
          const sortedLessons = [...part.lessons].sort((a, b) => a.order - b.order);
          const isOpen = expandedParts.has(part.id);
          return (
            <div key={part.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                onClick={() => togglePart(part.id)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
              >
                <ChevronDown
                  size={13}
                  className={cn('text-slate-500 shrink-0 transition-transform duration-200', !isOpen && '-rotate-90')}
                />
                <span className="flex-1 text-xs font-semibold text-slate-300 uppercase tracking-wide truncate">
                  {partTitle}
                </span>
                <span className="text-[10px] text-slate-600">{sortedLessons.length}</span>
              </button>

              {isOpen && (
                <ul>
                  {sortedLessons.map((l) => {
                    const lTitle  = locale === 'en' ? (l.titleEn ?? l.title) : l.title;
                    const isCurrent = l.id === lesson.id;
                    return (
                      <li key={l.id}>
                        <button
                          onClick={() => { setSidebarOpen(false); router.push(`/${locale}/courses/${courseId}/learn/${l.id}`); }}
                          className={cn(
                            'w-full flex items-start gap-2.5 px-4 py-2.5 text-left text-xs transition-colors',
                            isCurrent
                              ? 'bg-orange-500/10 border-r-2 border-orange-500'
                              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                          )}
                        >
                          <div className={cn(
                            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                            isCurrent ? 'bg-orange-500' : 'border border-slate-600'
                          )}>
                            {isCurrent
                              ? <Play size={7} className="text-white ml-px" fill="currentColor" />
                              : <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                            }
                          </div>
                          <span className={cn('leading-snug line-clamp-2', isCurrent && 'font-medium text-orange-300')}>
                            {lTitle}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Back link */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#060c18' }}
      >
        <Link
          href={`/${locale}/courses/${courseId}`}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-orange-400 transition-colors"
        >
          <ChevronLeft size={12} />
          Back to course
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden bg-white">
      {/* ── Desktop sidebar (RIGHT) ── */}
      <div className="hidden lg:flex flex-col order-2 shrink-0 overflow-hidden"
        style={{ width: 300, borderLeft: '1px solid #e2e8f0' }}>
        <SidebarInner />
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 ml-auto w-72 h-full overflow-hidden flex flex-col shadow-2xl">
            <SidebarInner />
          </aside>
        </div>
      )}

      {/* ── Main content (LEFT/CENTER) ── */}
      <div className="flex-1 flex flex-col overflow-hidden order-1 min-w-0">
        {/* ── Video area (sticky) ── */}
        <div className="shrink-0 bg-black">
          {/* Mobile topbar */}
          <div
            className="flex lg:hidden items-center justify-between px-4 h-11"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#060c18' }}
          >
            <span className="text-xs font-medium text-slate-300 truncate max-w-[200px]">{lessonTitle}</span>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <Menu size={16} />
            </button>
          </div>

          {/* YouTube player */}
          <div className="aspect-video w-full">
            <YouTube
              videoId={lesson.youtubeId}
              className="w-full h-full"
              iframeClassName="w-full h-full"
              opts={{
                width: '100%',
                height: '100%',
                playerVars: { start: progress?.lastPositionSec ?? 0, rel: 0, modestbranding: 1 },
              }}
              onStateChange={onPlayerStateChange}
            />
          </div>
        </div>

        {/* ── Scrollable content below video ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl px-5 py-5 space-y-5">
            {/* Title + completion */}
            <div className="flex items-start gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 flex-1 leading-snug">{lessonTitle}</h1>
              {completed && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 shrink-0">
                  <CheckCircle2 size={13} />
                  {t('completed')}
                </span>
              )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="content">
              <TabsList className="bg-slate-100 p-1 rounded-lg">
                <TabsTrigger
                  value="content"
                  className="rounded-md text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
                >
                  {t('content')}
                </TabsTrigger>
                {lesson.quiz && (
                  <TabsTrigger
                    value="quiz"
                    className="rounded-md text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
                  >
                    {t('quiz')}
                  </TabsTrigger>
                )}
                {lesson.assignment && (
                  <TabsTrigger
                    value="assignment"
                    className="rounded-md text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
                  >
                    {t('assignment')}
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="content" className="mt-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
                    {lessonContent || 'No content available.'}
                  </pre>
                </div>
              </TabsContent>

              {lesson.quiz && (
                <TabsContent value="quiz" className="mt-4">
                  <QuizPanel quiz={lesson.quiz} t={t} />
                </TabsContent>
              )}
              {lesson.assignment && (
                <TabsContent value="assignment" className="mt-4">
                  <AssignmentPanel assignment={lesson.assignment} t={t} />
                </TabsContent>
              )}
            </Tabs>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {prevLessonId ? (
                <Link
                  href={`/${locale}/courses/${courseId}/learn/${prevLessonId}`}
                  className="inline-flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:border-orange-300 hover:text-orange-600 transition-colors"
                >
                  <ChevronLeft size={15} />
                  {t('prev')}
                </Link>
              ) : <div />}

              {nextLessonId && (
                <Link
                  href={`/${locale}/courses/${courseId}/learn/${nextLessonId}`}
                  className="inline-flex items-center gap-2 px-5 h-9 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #ea6c0a)',
                    boxShadow: '0 3px 10px rgba(249,115,22,0.3)',
                  }}
                >
                  {t('next')}
                  <ChevronRight size={15} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Quiz Panel ── */
function QuizPanel({ quiz, t }: { quiz: Quiz; t: (key: string) => string }) {
  const [answers, setAnswers] = useState<(number | null)[]>(Array(quiz.questions.length).fill(null));
  const [result, setResult] = useState<{ score: number; passed: boolean; correctAnswers: number[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (answers.some((a) => a === null)) { toast.error('Please answer all questions'); return; }
    setLoading(true);
    const res = await fetch(`/api/quiz/${quiz.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  if (result) {
    return (
      <div className="space-y-4">
        <div className={cn('rounded-xl p-5 text-center border', result.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200')}>
          <p className={cn('text-4xl font-extrabold', result.passed ? 'text-emerald-600' : 'text-rose-600')}>{result.score}%</p>
          <p className={cn('text-sm font-semibold mt-1', result.passed ? 'text-emerald-500' : 'text-rose-500')}>
            {result.passed ? '🎉 Passed!' : 'Not quite — try again'}
          </p>
        </div>
        <div className="space-y-3">
          {quiz.questions.map((q, i) => {
            const isCorrect = answers[i] === result.correctAnswers[i];
            return (
              <div key={i} className={cn('rounded-xl p-3.5 border text-sm', isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200')}>
                <p className="font-semibold text-slate-800 mb-1.5">{q.q}</p>
                <p className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                  {isCorrect ? '✓' : '✗'} {q.options[answers[i] ?? 0]}
                </p>
                {!isCorrect && <p className="text-emerald-700 mt-1">Correct: {q.options[result.correctAnswers[i]]}</p>}
                {q.explanation && <p className="text-slate-500 mt-1 text-xs">{q.explanation}</p>}
              </div>
            );
          })}
        </div>
        <Button variant="outline" onClick={() => { setResult(null); setAnswers(Array(quiz.questions.length).fill(null)); }}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {quiz.questions.map((q, i) => (
        <div key={i} className="space-y-2.5">
          <p className="font-semibold text-slate-800 text-sm">{i + 1}. {q.q}</p>
          <ul className="space-y-1.5">
            {q.options.map((opt, j) => (
              <li key={j}>
                <label className="flex items-center gap-2.5 cursor-pointer rounded-lg border px-3.5 py-2.5 text-sm hover:border-orange-300 hover:bg-orange-50/50 transition-colors has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                  <input
                    type="radio" name={`q-${i}`} value={j}
                    checked={answers[i] === j}
                    onChange={() => { const next = [...answers]; next[i] = j; setAnswers(next); }}
                    className="accent-orange-500"
                  />
                  <span className="text-slate-700">{opt}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button
        onClick={submit}
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 h-10 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-all"
        style={{ background: 'linear-gradient(135deg, #f97316, #ea6c0a)' }}
      >
        {loading ? 'Submitting...' : t('submitQuiz')}
      </button>
    </div>
  );
}

/* ── Assignment Panel ── */
function AssignmentPanel({ assignment, t }: { assignment: Assignment; t: (key: string) => string }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!content.trim()) { toast.error('Please write your answer'); return; }
    setLoading(true);
    await fetch(`/api/assignments/${assignment.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setLoading(false);
    setSubmitted(true);
    toast.success('Assignment submitted!');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
        <h3 className="font-bold text-slate-800">{assignment.title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{assignment.description}</p>
      </div>
      {submitted ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
          <p className="font-semibold text-emerald-700">Submitted successfully!</p>
        </div>
      ) : (
        <>
          <Textarea
            placeholder={t('yourAnswer')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-36 text-sm"
          />
          <button
            onClick={submit}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 h-10 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-all"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea6c0a)' }}
          >
            {loading ? 'Submitting...' : t('submitAssignment')}
          </button>
        </>
      )}
    </div>
  );
}
