'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, ArrowLeft, Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Lesson = {
  id: number;
  title: string;
  titleEn?: string | null;
  youtubeId: string;
  content: string;
  contentEn?: string | null;
  order: number;
  durationSec: number;
};

type Part = {
  id: number;
  title: string;
  titleEn?: string | null;
  order: number;
  lessons: Lesson[];
};

type Course = {
  id: number;
  title: string;
  titleEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  level: string;
  thumbnail?: string | null;
  published: boolean;
  parts: Part[];
};

export default function EditCoursePage() {
  const params = useParams();
  const locale = params.locale as string;
  const courseId = params.id as string;
  const router = useRouter();
  const tc = useTranslations('courses');
  const t = useTranslations('admin.courses');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [expandedParts, setExpandedParts] = useState<Set<number>>(new Set());

  const [form, setForm] = useState({
    title: '',
    titleEn: '',
    description: '',
    descriptionEn: '',
    level: 'beginner',
    thumbnail: '',
  });

  useEffect(() => {
    fetch(`/api/admin/courses/${courseId}`)
      .then((r) => r.json())
      .then((data: Course) => {
        setCourse(data);
        setParts(data.parts ?? []);
        setForm({
          title: data.title,
          titleEn: data.titleEn ?? '',
          description: data.description,
          descriptionEn: data.descriptionEn ?? '',
          level: data.level,
          thumbnail: data.thumbnail ?? '',
        });
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load course');
        setLoading(false);
      });
  }, [courseId]);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const saveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/admin/courses/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      toast.success('Course updated!');
    } else {
      toast.error('Failed to update');
    }
  };

  const addPart = async () => {
    const title = prompt('Part title (VI):');
    if (!title) return;
    const res = await fetch('/api/admin/parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: Number(courseId), title, order: parts.length + 1 }),
    });
    if (res.ok) {
      const newPart = await res.json();
      setParts((p) => [...p, { ...newPart, lessons: [] }]);
      toast.success('Part added');
    } else {
      toast.error('Failed to add part');
    }
  };

  const deletePart = async (partId: number) => {
    if (!confirm('Delete this part and all its lessons?')) return;
    const res = await fetch(`/api/admin/parts/${partId}`, { method: 'DELETE' });
    if (res.ok) {
      setParts((p) => p.filter((pt) => pt.id !== partId));
      toast.success('Part deleted');
    } else {
      toast.error('Failed to delete part');
    }
  };

  const addLesson = async (partId: number) => {
    const title = prompt('Lesson title (VI):');
    if (!title) return;
    const youtubeId = prompt('YouTube video ID:');
    if (!youtubeId) return;
    const part = parts.find((p) => p.id === partId);
    const res = await fetch('/api/admin/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partId,
        title,
        youtubeId,
        content: '',
        order: (part?.lessons.length ?? 0) + 1,
      }),
    });
    if (res.ok) {
      const newLesson = await res.json();
      setParts((prev) =>
        prev.map((p) =>
          p.id === partId ? { ...p, lessons: [...p.lessons, newLesson] } : p,
        ),
      );
      toast.success('Lesson added');
    } else {
      toast.error('Failed to add lesson');
    }
  };

  const deleteLesson = async (lessonId: number, partId: number) => {
    if (!confirm('Delete this lesson?')) return;
    const res = await fetch(`/api/admin/lessons/${lessonId}`, { method: 'DELETE' });
    if (res.ok) {
      setParts((prev) =>
        prev.map((p) =>
          p.id === partId
            ? { ...p, lessons: p.lessons.filter((l) => l.id !== lessonId) }
            : p,
        ),
      );
      toast.success('Lesson deleted');
    } else {
      toast.error('Failed to delete lesson');
    }
  };

  const updateLessonField = async (
    lessonId: number,
    partId: number,
    field: string,
    value: string,
  ) => {
    setParts((prev) =>
      prev.map((p) =>
        p.id === partId
          ? {
              ...p,
              lessons: p.lessons.map((l) =>
                l.id === lessonId ? { ...l, [field]: value } : l,
              ),
            }
          : p,
      ),
    );
  };

  const saveLesson = async (lessonId: number, partId: number) => {
    const part = parts.find((p) => p.id === partId);
    const lesson = part?.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    const res = await fetch(`/api/admin/lessons/${lessonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lesson),
    });
    if (res.ok) {
      toast.success('Lesson saved');
    } else {
      toast.error('Failed to save lesson');
    }
  };

  const togglePart = (partId: number) => {
    setExpandedParts((prev) => {
      const next = new Set(prev);
      if (next.has(partId)) next.delete(partId);
      else next.add(partId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 size={24} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/courses`}
          className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Edit: {course.title}</h1>
      </div>

      {/* Course form */}
      <form onSubmit={saveCourse} className="space-y-5 bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-700">Course Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title (VI) *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="titleEn">Title (EN)</Label>
            <Input
              id="titleEn"
              value={form.titleEn}
              onChange={(e) => set('titleEn', e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Description (VI) *</Label>
          <Textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Description (EN)</Label>
          <Textarea
            value={form.descriptionEn}
            onChange={(e) => set('descriptionEn', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Level</Label>
            <Select value={form.level} onValueChange={(val) => set('level', val ?? 'beginner')}>
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
            <Label>Thumbnail URL</Label>
            <Input
              value={form.thumbnail}
              onChange={(e) => set('thumbnail', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500">
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
          </Button>
        </div>
      </form>

      {/* Parts management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 text-lg">Course Content</h2>
          <Button
            onClick={addPart}
            variant="outline"
            size="sm"
            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <Plus size={14} />
            Add Part
          </Button>
        </div>

        <div className="space-y-3">
          {parts
            .sort((a, b) => a.order - b.order)
            .map((part) => {
              const isOpen = expandedParts.has(part.id);
              return (
                <div
                  key={part.id}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-slate-50 transition-colors"
                    onClick={() => togglePart(part.id)}
                  >
                    {isOpen ? (
                      <ChevronDown size={16} className="text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="text-slate-400 shrink-0" />
                    )}
                    <span className="font-medium text-slate-800 flex-1">{part.title}</span>
                    <span className="text-xs text-slate-500">
                      {part.lessons.length} lessons
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePart(part.id);
                      }}
                      className={cn(
                        buttonVariants({ variant: 'destructive', size: 'icon-xs' }),
                      )}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-100">
                      <div className="divide-y divide-slate-100">
                        {part.lessons
                          .sort((a, b) => a.order - b.order)
                          .map((lesson) => (
                            <div key={lesson.id} className="p-4 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-slate-700 text-sm">
                                  {lesson.title}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => saveLesson(lesson.id, part.id)}
                                    className={cn(
                                      buttonVariants({ size: 'xs' }),
                                      'bg-indigo-600 hover:bg-indigo-500',
                                    )}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => deleteLesson(lesson.id, part.id)}
                                    className={cn(
                                      buttonVariants({ variant: 'destructive', size: 'icon-xs' }),
                                    )}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                  <Label className="text-xs">Title (VI)</Label>
                                  <Input
                                    value={lesson.title}
                                    onChange={(e) =>
                                      updateLessonField(lesson.id, part.id, 'title', e.target.value)
                                    }
                                    className="h-7 text-xs"
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Label className="text-xs">Title (EN)</Label>
                                  <Input
                                    value={lesson.titleEn ?? ''}
                                    onChange={(e) =>
                                      updateLessonField(lesson.id, part.id, 'titleEn', e.target.value)
                                    }
                                    className="h-7 text-xs"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <Label className="text-xs">YouTube ID</Label>
                                <Input
                                  value={lesson.youtubeId}
                                  onChange={(e) =>
                                    updateLessonField(lesson.id, part.id, 'youtubeId', e.target.value)
                                  }
                                  className="h-7 text-xs"
                                  placeholder="dQw4w9WgXcQ"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <Label className="text-xs">Content (VI)</Label>
                                <Textarea
                                  value={lesson.content}
                                  onChange={(e) =>
                                    updateLessonField(lesson.id, part.id, 'content', e.target.value)
                                  }
                                  className="min-h-20 text-xs"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <Label className="text-xs">Content (EN)</Label>
                                <Textarea
                                  value={lesson.contentEn ?? ''}
                                  onChange={(e) =>
                                    updateLessonField(lesson.id, part.id, 'contentEn', e.target.value)
                                  }
                                  className="min-h-20 text-xs"
                                />
                              </div>
                            </div>
                          ))}
                      </div>

                      <div className="px-4 py-3 border-t border-slate-100">
                        <button
                          onClick={() => addLesson(part.id)}
                          className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                            'border-dashed border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600',
                          )}
                        >
                          <Plus size={14} />
                          Add Lesson
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          {parts.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 py-10 text-slate-400">
              <p className="text-sm">No parts yet. Add your first part.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
