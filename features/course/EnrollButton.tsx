'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Play } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Props = {
  courseId: number;
  locale: string;
  firstLessonId?: number | null;
};

export function EnrollButton({ courseId, locale, firstLessonId }: Props) {
  const t = useTranslations('courses');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleEnroll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');

      const lessonId = data.firstLessonId ?? firstLessonId;
      if (lessonId) {
        router.push(`/${locale}/courses/${courseId}/learn/${lessonId}`);
      } else {
        router.refresh();
      }
    } catch {
      toast.error('Đăng ký thất bại, thử lại.');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleEnroll}
      disabled={loading}
      className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-70')}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
      {loading ? 'Đang xử lý...' : t('enroll')}
    </button>
  );
}
