'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

type Props = {
  locale: string;
};

export function CourseSearch({ locale }: Props) {
  const t = useTranslations('courses');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentQ = searchParams.get('q') ?? '';
  const currentLevel = searchParams.get('level') ?? 'all';

  const updateParams = useCallback(
    (q: string, level: string) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (level && level !== 'all') params.set('level', level);
      startTransition(() => {
        router.push(`/${locale}/courses?${params.toString()}`);
      });
    },
    [locale, router],
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          defaultValue={currentQ}
          placeholder={t('search')}
          className="pl-8"
          onChange={(e) => updateParams(e.target.value, currentLevel)}
        />
      </div>
      <Select
        defaultValue={currentLevel}
        onValueChange={(val) => updateParams(currentQ, val ?? 'all')}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder={t('allLevels')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('allLevels')}</SelectItem>
          <SelectItem value="beginner">{t('beginner')}</SelectItem>
          <SelectItem value="intermediate">{t('intermediate')}</SelectItem>
          <SelectItem value="advanced">{t('advanced')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
