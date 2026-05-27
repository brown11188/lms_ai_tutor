'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NewCoursePage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('admin.courses');
  const tc = useTranslations('courses');

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    titleEn: '',
    description: '',
    descriptionEn: '',
    level: 'beginner',
    thumbnail: '',
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      toast.error('Title and description are required');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      toast.success('Course created!');
      router.push(`/${locale}/admin/courses/${data.id}/edit`);
    } else {
      toast.error('Failed to create course');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/courses`}
          className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">{t('new')}</h1>
      </div>

      <form onSubmit={submit} className="space-y-5 bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title (VI) *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Tên khóa học"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="titleEn">Title (EN)</Label>
            <Input
              id="titleEn"
              value={form.titleEn}
              onChange={(e) => set('titleEn', e.target.value)}
              placeholder="Course title"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Description (VI) *</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Mô tả khóa học..."
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="descriptionEn">Description (EN)</Label>
          <Textarea
            id="descriptionEn"
            value={form.descriptionEn}
            onChange={(e) => set('descriptionEn', e.target.value)}
            placeholder="Course description..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Level</Label>
            <Select
              defaultValue={form.level}
              onValueChange={(val) => set('level', val ?? 'beginner')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">{tc('beginner')}</SelectItem>
                <SelectItem value="intermediate">{tc('intermediate')}</SelectItem>
                <SelectItem value="advanced">{tc('advanced')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="thumbnail">Thumbnail URL</Label>
            <Input
              id="thumbnail"
              value={form.thumbnail}
              onChange={(e) => set('thumbnail', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        {form.thumbnail && (
          <img
            src={form.thumbnail}
            alt="Preview"
            className="w-full h-40 object-cover rounded-lg border border-slate-200"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href={`/${locale}/admin/courses`}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create Course'}
          </Button>
        </div>
      </form>
    </div>
  );
}
