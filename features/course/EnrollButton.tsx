'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Play } from 'lucide-react';
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
      className="inline-flex items-center gap-2 px-6 h-11 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-70 disabled:cursor-not-allowed"
      style={{
        background: 'linear-gradient(135deg, #f97316, #ea6c0a)',
        boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
      }}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Play size={16} fill="currentColor" />
      )}
      {loading ? 'Đang xử lý...' : t('enroll')}
    </button>
  );
}
