'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles, Bot, User, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type EnrolledCourse = {
  id: number;
  title: string;
  titleEn?: string | null;
};

export default function AIPage() {
  const t = useTranslations('ai');
  const locale = useLocale();
  const params = useParams();

  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/ai/chat')
      .then((r) => r.json())
      .then((data) => {
        if (data.courses) setCourses(data.courses);
        if (data.messages) setMessages(data.messages);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setStreaming(true);

    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          courseId: selectedCourseId,
        }),
      });

      if (!res.body) throw new Error('No body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: acc };
          return next;
        });
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, messages, selectedCourseId, streaming]);

  const summarizeCourse = useCallback(async () => {
    if (!selectedCourseId || streaming) return;
    setThinking(true);
    setStreaming(true);

    const userMsg: Message = {
      role: 'user',
      content: t('summarize'),
    };
    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourseId, locale }),
      });

      if (!res.body) throw new Error('No body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';

      setThinking(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: acc };
          return next;
        });
      }
    } catch {
      setThinking(false);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: 'Failed to summarize course.',
        };
        return next;
      });
    } finally {
      setStreaming(false);
      setThinking(false);
    }
  }, [selectedCourseId, streaming, locale, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar: course list */}
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('title')}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button
            onClick={() => setSelectedCourseId(null)}
            className={cn(
              'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
              selectedCourseId === null
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-slate-600 hover:bg-slate-50',
            )}
          >
            <Bot size={14} className="shrink-0" />
            General
          </button>

          {courses.map((course) => {
            const title = locale === 'en' ? (course.titleEn ?? course.title) : course.title;
            return (
              <button
                key={course.id}
                onClick={() => setSelectedCourseId(course.id)}
                className={cn(
                  'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  selectedCourseId === course.id
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <BookOpen size={14} className="shrink-0" />
                <span className="line-clamp-2 leading-snug">{title}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right: chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">
              {selectedCourse
                ? locale === 'en'
                  ? (selectedCourse.titleEn ?? selectedCourse.title)
                  : selectedCourse.title
                : 'General AI Tutor'}
            </span>
          </div>
          {selectedCourseId && (
            <Button
              onClick={summarizeCourse}
              disabled={streaming}
              size="sm"
              variant="outline"
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 gap-1.5"
            >
              <Sparkles size={13} />
              {t('summarize')}
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
                <Bot size={24} className="text-indigo-600" />
              </div>
              <p className="text-sm">{t('placeholder')}</p>
              {selectedCourseId && (
                <p className="text-xs text-indigo-500">{t('selectCourse')}</p>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-3 max-w-3xl',
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : '',
              )}
            >
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600',
                )}
              >
                {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
              </div>
              <div
                className={cn(
                  'rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-800',
                  msg.content === '' && 'min-w-8',
                )}
              >
                {msg.content === '' && streaming ? (
                  <span className="flex gap-1 items-center py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                  </span>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Bot size={14} className="text-indigo-500" />
              {t('thinking')}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-slate-200 bg-white p-4">
          <div className="flex gap-3 items-end max-w-3xl mx-auto">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('placeholder')}
              disabled={streaming}
              className="min-h-10 max-h-40 resize-none"
            />
            <Button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-500 h-10"
            >
              <Send size={15} />
              <span className="sr-only">{t('send')}</span>
            </Button>
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
