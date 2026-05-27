'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import YouTube from 'react-youtube';
import type { YouTubePlayer } from 'react-youtube';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type QuizQuestion = {
  q: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

type Quiz = {
  id: number;
  questions: QuizQuestion[];
  passingScore: number;
};

type Assignment = {
  id: number;
  title: string;
  description: string;
};

type Lesson = {
  id: number;
  title: string;
  titleEn?: string | null;
  content: string;
  contentEn?: string | null;
  youtubeId: string;
  durationSec: number;
  partId: number;
  order: number;
  quiz?: Quiz | null;
  assignment?: Assignment | null;
};

type LessonMini = {
  id: number;
  title: string;
  titleEn?: string | null;
  order: number;
};

type Part = {
  id: number;
  title: string;
  titleEn?: string | null;
  order: number;
  lessons: LessonMini[];
};

type Props = {
  lesson: Lesson;
  allParts: Part[];
  progress: { lastPositionSec: number; completed: boolean } | null;
  locale: string;
  courseId: number;
  prevLessonId: number | null;
  nextLessonId: number | null;
};

export function LearnClient({
  lesson,
  allParts,
  progress,
  locale,
  courseId,
  prevLessonId,
  nextLessonId,
}: Props) {
  const t = useTranslations('lesson');
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completed, setCompleted] = useState(progress?.completed ?? false);

  const playerRef = useRef<YouTubePlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const postProgress = useCallback(
    async (lastPositionSec: number, isCompleted: boolean) => {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          lastPositionSec,
          completed: isCompleted,
        }),
      });
    },
    [lesson.id],
  );

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
      } catch {
        /* ignore */
      }
    }, 5000);
  }, [lesson.durationSec, completed, postProgress]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  const onPlayerStateChange = (event: { data: number; target: YouTubePlayer }) => {
    playerRef.current = event.target;
    if (event.data === 1) {
      startTracking();
    } else {
      stopTracking();
    }
  };

  const sortedParts = [...allParts].sort((a, b) => a.order - b.order);

  const lessonTitle = locale === 'en' ? (lesson.titleEn ?? lesson.title) : lesson.title;
  const lessonContent =
    locale === 'en' ? (lesson.contentEn ?? lesson.content) : lesson.content;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-200">
        <Link
          href={`/${locale}/courses/${courseId}`}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          <ChevronLeft size={14} />
          Back to course
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sortedParts.map((part) => {
          const partTitle = locale === 'en' ? (part.titleEn ?? part.title) : part.title;
          const sortedLessons = [...part.lessons].sort((a, b) => a.order - b.order);
          return (
            <div key={part.id}>
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {partTitle}
                </p>
              </div>
              <ul>
                {sortedLessons.map((l) => {
                  const lTitle = locale === 'en' ? (l.titleEn ?? l.title) : l.title;
                  const isCurrent = l.id === lesson.id;
                  return (
                    <li key={l.id}>
                      <button
                        onClick={() => {
                          setSidebarOpen(false);
                          router.push(`/${locale}/courses/${courseId}/learn/${l.id}`);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors',
                          isCurrent
                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                            : 'text-slate-600 hover:bg-slate-50',
                        )}
                      >
                        <CheckCircle2
                          size={14}
                          className={cn(
                            'shrink-0',
                            isCurrent ? 'text-indigo-500' : 'text-slate-300',
                          )}
                        />
                        <span className="line-clamp-2 leading-snug">{lTitle}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 w-72 bg-white h-full overflow-hidden flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <span className="font-semibold text-slate-800 text-sm">Course Content</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SidebarContent />
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile topbar */}
        <div className="flex lg:hidden items-center gap-3 px-4 h-12 border-b border-slate-200 bg-white shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded hover:bg-slate-100"
          >
            <Menu size={18} />
          </button>
          <span className="text-sm font-medium text-slate-700 truncate">{lessonTitle}</span>
        </div>

        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
          {/* Title & completion badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800 flex-1">{lessonTitle}</h1>
            {completed && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 size={13} />
                {t('completed')}
              </span>
            )}
          </div>

          {/* YouTube player */}
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg">
            <YouTube
              videoId={lesson.youtubeId}
              className="w-full h-full"
              iframeClassName="w-full h-full"
              opts={{
                width: '100%',
                height: '100%',
                playerVars: {
                  start: progress?.lastPositionSec ?? 0,
                  rel: 0,
                },
              }}
              onStateChange={onPlayerStateChange}
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">{t('content')}</TabsTrigger>
              {lesson.quiz && <TabsTrigger value="quiz">{t('quiz')}</TabsTrigger>}
              {lesson.assignment && (
                <TabsTrigger value="assignment">{t('assignment')}</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="content" className="mt-4">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-200">
                {lessonContent || 'No content available.'}
              </pre>
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
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {prevLessonId ? (
              <Link
                href={`/${locale}/courses/${courseId}/learn/${prevLessonId}`}
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                <ChevronLeft size={16} />
                {t('prev')}
              </Link>
            ) : (
              <div />
            )}
            {nextLessonId && (
              <Link
                href={`/${locale}/courses/${courseId}/learn/${nextLessonId}`}
                className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-500')}
              >
                {t('next')}
                <ChevronRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuizPanel({ quiz, t }: { quiz: Quiz; t: (key: string) => string }) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(quiz.questions.length).fill(null),
  );
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    correctAnswers: number[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (answers.some((a) => a === null)) {
      toast.error('Please answer all questions');
      return;
    }
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
        <div
          className={cn(
            'rounded-xl p-5 text-center border',
            result.passed
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-rose-50 border-rose-200',
          )}
        >
          <p
            className={cn(
              'text-3xl font-bold',
              result.passed ? 'text-emerald-700' : 'text-rose-700',
            )}
          >
            {result.score}%
          </p>
          <p
            className={cn(
              'text-sm font-medium mt-1',
              result.passed ? 'text-emerald-600' : 'text-rose-600',
            )}
          >
            {result.passed ? 'Passed!' : 'Try again'}
          </p>
        </div>
        <div className="space-y-3">
          {quiz.questions.map((q, i) => {
            const isCorrect = answers[i] === result.correctAnswers[i];
            return (
              <div
                key={i}
                className={cn(
                  'rounded-lg p-3 border text-sm',
                  isCorrect
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-rose-50 border-rose-200',
                )}
              >
                <p className="font-medium text-slate-800 mb-1">{q.q}</p>
                <p className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                  {isCorrect ? '✓' : '✗'} {q.options[answers[i] ?? 0]}
                </p>
                {!isCorrect && (
                  <p className="text-emerald-700 mt-1">
                    Correct: {q.options[result.correctAnswers[i]]}
                  </p>
                )}
                {q.explanation && (
                  <p className="text-slate-500 mt-1 text-xs">{q.explanation}</p>
                )}
              </div>
            );
          })}
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setResult(null);
            setAnswers(Array(quiz.questions.length).fill(null));
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {quiz.questions.map((q, i) => (
        <div key={i} className="space-y-2">
          <p className="font-medium text-slate-800 text-sm">
            {i + 1}. {q.q}
          </p>
          <ul className="space-y-1.5">
            {q.options.map((opt, j) => (
              <li key={j}>
                <label className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50">
                  <input
                    type="radio"
                    name={`q-${i}`}
                    value={j}
                    checked={answers[i] === j}
                    onChange={() => {
                      const next = [...answers];
                      next[i] = j;
                      setAnswers(next);
                    }}
                    className="accent-indigo-600"
                  />
                  {opt}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Button
        onClick={submit}
        disabled={loading}
        className="bg-indigo-600 hover:bg-indigo-500"
      >
        {loading ? 'Submitting...' : t('submitQuiz')}
      </Button>
    </div>
  );
}

function AssignmentPanel({
  assignment,
  t,
}: {
  assignment: Assignment;
  t: (key: string) => string;
}) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!content.trim()) {
      toast.error('Please write your answer');
      return;
    }
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
        <h3 className="font-semibold text-slate-800">{assignment.title}</h3>
        <p className="text-sm text-slate-600">{assignment.description}</p>
      </div>

      {submitted ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="font-medium text-emerald-700">Submitted successfully!</p>
        </div>
      ) : (
        <>
          <Textarea
            placeholder={t('yourAnswer')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-32"
          />
          <Button
            onClick={submit}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            {loading ? 'Submitting...' : t('submitAssignment')}
          </Button>
        </>
      )}
    </div>
  );
}
