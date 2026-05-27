import {
  pgTable, serial, text, integer, boolean, timestamp,
  pgEnum, jsonb, uniqueIndex, varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['ADMIN', 'STUDENT']);
export const levelEnum = pgEnum('level', ['beginner', 'intermediate', 'advanced']);
export const localeEnum = pgEnum('locale', ['vi', 'en']);
export const assignmentStatusEnum = pgEnum('assignment_status', ['PENDING', 'SUBMITTED', 'GRADED']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  role: roleEnum('role').notNull().default('STUDENT'),
  avatar: text('avatar'),
  locale: localeEnum('locale').notNull().default('vi'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  titleEn: text('title_en'),
  description: text('description').notNull(),
  descriptionEn: text('description_en'),
  thumbnail: text('thumbnail'),
  level: levelEnum('level').notNull().default('beginner'),
  instructorId: integer('instructor_id').notNull().references(() => users.id),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const parts = pgTable('parts', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
  title: text('title').notNull(),
  titleEn: text('title_en'),
});

export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  partId: integer('part_id').notNull().references(() => parts.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
  title: text('title').notNull(),
  titleEn: text('title_en'),
  content: text('content').notNull().default(''),
  contentEn: text('content_en'),
  youtubeId: varchar('youtube_id', { length: 32 }).notNull(),
  durationSec: integer('duration_sec').notNull().default(0),
});

export const enrollments = pgTable('enrollments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('enrollments_user_course_unique').on(t.userId, t.courseId),
]);

export const progresses = pgTable('progresses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: integer('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  lastPositionSec: integer('last_position_sec').notNull().default(0),
  completed: boolean('completed').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('progresses_user_lesson_unique').on(t.userId, t.lessonId),
]);

export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  lessonId: integer('lesson_id').notNull().unique().references(() => lessons.id, { onDelete: 'cascade' }),
  questions: jsonb('questions').notNull().$type<QuizQuestion[]>(),
  passingScore: integer('passing_score').notNull().default(70),
});

export const quizAttempts = pgTable('quiz_attempts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  quizId: integer('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  answers: jsonb('answers').notNull().$type<number[]>(),
  takenAt: timestamp('taken_at').notNull().defaultNow(),
});

export const assignments = pgTable('assignments', {
  id: serial('id').primaryKey(),
  lessonId: integer('lesson_id').notNull().unique().references(() => lessons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  dueDate: timestamp('due_date'),
});

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  assignmentId: integer('assignment_id').notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  fileUrl: text('file_url'),
  status: assignmentStatusEnum('status').notNull().default('PENDING'),
  grade: integer('grade'),
  feedback: text('feedback'),
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  gradedAt: timestamp('graded_at'),
});

export const aiChats = pgTable('ai_chats', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'set null' }),
  messages: jsonb('messages').notNull().$type<ChatMessage[]>().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  enrollments: many(enrollments),
  progresses: many(progresses),
  submissions: many(submissions),
  quizAttempts: many(quizAttempts),
  aiChats: many(aiChats),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, { fields: [courses.instructorId], references: [users.id] }),
  parts: many(parts),
  enrollments: many(enrollments),
  aiChats: many(aiChats),
}));

export const partsRelations = relations(parts, ({ one, many }) => ({
  course: one(courses, { fields: [parts.courseId], references: [courses.id] }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  part: one(parts, { fields: [lessons.partId], references: [parts.id] }),
  quiz: one(quizzes, { fields: [lessons.id], references: [quizzes.lessonId] }),
  assignment: one(assignments, { fields: [lessons.id], references: [assignments.lessonId] }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, { fields: [enrollments.userId], references: [users.id] }),
  course: one(courses, { fields: [enrollments.courseId], references: [courses.id] }),
}));

export const progressesRelations = relations(progresses, ({ one }) => ({
  user: one(users, { fields: [progresses.userId], references: [users.id] }),
  lesson: one(lessons, { fields: [progresses.lessonId], references: [lessons.id] }),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  lesson: one(lessons, { fields: [quizzes.lessonId], references: [lessons.id] }),
  attempts: many(quizAttempts),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  lesson: one(lessons, { fields: [assignments.lessonId], references: [lessons.id] }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, { fields: [submissions.assignmentId], references: [assignments.id] }),
  user: one(users, { fields: [submissions.userId], references: [users.id] }),
}));

// Types
export type QuizQuestion = {
  q: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};
