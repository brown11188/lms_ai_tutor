import { db } from './index';
import { users, courses, parts, lessons, enrollments, quizzes, assignments } from './schema';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding database...');

  // Check RESET_SEED env to force re-seed (wipes all data)
  if (process.env.RESET_SEED === 'true') {
    console.log('RESET_SEED=true — wiping all data...');
    await db.execute(sql`TRUNCATE TABLE submissions, quiz_attempts, ai_chats, progresses, enrollments, assignments, quizzes, lessons, parts, courses, users RESTART IDENTITY CASCADE`);
  } else {
    // Idempotent: skip if admin already exists
    const existing = await db.select().from(users).where(eq(users.email, 'admin@lms.local')).limit(1);
    if (existing.length > 0) {
      console.log('Seed already applied, skipping.');
      process.exit(0);
    }
  }

  const adminHash = await bcrypt.hash('Admin@123', 10);
  const studentHash = await bcrypt.hash('Student@123', 10);

  const [admin] = await db.insert(users).values({
    email: 'admin@lms.local',
    passwordHash: adminHash,
    name: 'Admin',
    role: 'ADMIN',
    locale: 'vi',
  }).returning();

  const [student1] = await db.insert(users).values({
    email: 'student1@lms.local',
    passwordHash: studentHash,
    name: 'Nguyen Van A',
    role: 'STUDENT',
    locale: 'vi',
  }).returning();

  await db.insert(users).values({
    email: 'student2@lms.local',
    passwordHash: studentHash,
    name: 'Tran Thi B',
    role: 'STUDENT',
    locale: 'en',
  });

  // Course 1: JavaScript
  const [course1] = await db.insert(courses).values({
    title: 'JavaScript Cơ Bản',
    titleEn: 'JavaScript Basics',
    description: 'Học lập trình JavaScript từ zero đến hero. Phù hợp cho người mới bắt đầu.',
    descriptionEn: 'Learn JavaScript from zero to hero. Suitable for beginners.',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png',
    level: 'beginner',
    instructorId: admin.id,
    published: true,
  }).returning();

  const [part1_1] = await db.insert(parts).values({
    courseId: course1.id, order: 1, title: 'Nhập môn JavaScript', titleEn: 'Introduction to JavaScript',
  }).returning();

  const [part1_2] = await db.insert(parts).values({
    courseId: course1.id, order: 2, title: 'Hàm và Phạm vi', titleEn: 'Functions & Scope',
  }).returning();

  // YouTube IDs: well-known programming tutorial videos
  // JS Crash Course - Traversy Media: W6NZfCO5SIk
  // JS Variables - Programming with Mosh: NuDBcPATxgM
  // JS Functions - LearnCode: ObM5EMpPGcA
  const [lesson1] = await db.insert(lessons).values({
    partId: part1_1.id, order: 1,
    title: 'JavaScript là gì?', titleEn: 'What is JavaScript?',
    content: '## JavaScript là gì?\n\nJavaScript là ngôn ngữ lập trình phổ biến nhất thế giới, chạy trên trình duyệt và máy chủ (Node.js).\n\n### Tại sao học JavaScript?\n- Ngôn ngữ duy nhất chạy trực tiếp trên browser\n- Có thể làm frontend lẫn backend (Node.js)\n- Cộng đồng lớn, nhiều thư viện',
    contentEn: '## What is JavaScript?\n\nJavaScript is the most popular programming language in the world.\n\n### Why learn JavaScript?\n- Only language that runs natively in browsers\n- Works for both frontend and backend (Node.js)\n- Huge community and ecosystem',
    youtubeId: 'W6NZfCO5SIk',
    durationSec: 6567,
  }).returning();

  const [lesson2] = await db.insert(lessons).values({
    partId: part1_1.id, order: 2,
    title: 'Biến và kiểu dữ liệu', titleEn: 'Variables & Data Types',
    content: '## Biến trong JavaScript\n\nSử dụng `let`, `const`, `var` để khai báo biến.\n\n- `let`: block-scoped, có thể thay đổi\n- `const`: block-scoped, không thay đổi\n- `var`: function-scoped, tránh dùng\n\n### Kiểu dữ liệu cơ bản\n`string`, `number`, `boolean`, `null`, `undefined`, `object`',
    contentEn: '## Variables in JavaScript\n\n- `let`: block-scoped, mutable\n- `const`: block-scoped, immutable\n- `var`: function-scoped, avoid\n\n### Primitive types\n`string`, `number`, `boolean`, `null`, `undefined`, `object`',
    youtubeId: 'NuDBcPATxgM',
    durationSec: 720,
  }).returning();

  await db.insert(lessons).values({
    partId: part1_2.id, order: 1,
    title: 'Hàm trong JavaScript', titleEn: 'Functions in JavaScript',
    content: '## Hàm (Function)\n\nHàm là khối code có thể tái sử dụng.\n\n```js\n// Function declaration\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\n// Arrow function\nconst add = (a, b) => a + b;\n```',
    contentEn: '## Functions\n\nFunctions are reusable blocks of code.\n\n```js\n// Function declaration\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\n// Arrow function\nconst add = (a, b) => a + b;\n```',
    youtubeId: 'ObM5EMpPGcA',
    durationSec: 600,
  });

  await db.insert(quizzes).values({
    lessonId: lesson1.id,
    questions: [
      { q: 'JavaScript chạy ở đâu?', options: ['Chỉ server', 'Chỉ browser', 'Cả browser và server', 'Không nơi nào'], correctIndex: 2, explanation: 'JavaScript chạy cả trên browser và server (Node.js).' },
      { q: 'JavaScript được tạo ra năm nào?', options: ['1990', '1995', '2000', '2005'], correctIndex: 1, explanation: 'JavaScript được Brendan Eich tạo ra năm 1995.' },
    ],
    passingScore: 70,
  });

  await db.insert(assignments).values({
    lessonId: lesson2.id,
    title: 'Bài tập: Khai báo biến',
    description: 'Viết một chương trình JavaScript khai báo 3 biến: tên, tuổi, thành phố. In kết quả ra console.',
  });

  // Course 2: ReactJS
  const [course2] = await db.insert(courses).values({
    title: 'ReactJS Thực Chiến',
    titleEn: 'ReactJS in Practice',
    description: 'Xây dựng ứng dụng web hiện đại với React, hooks, và state management.',
    descriptionEn: 'Build modern web apps with React, hooks, and state management.',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg',
    level: 'intermediate',
    instructorId: admin.id,
    published: true,
  }).returning();

  const [part2_1] = await db.insert(parts).values({
    courseId: course2.id, order: 1, title: 'React Cơ Bản', titleEn: 'React Fundamentals',
  }).returning();

  // React Crash Course - Traversy Media: w7ejDZ8SWv8
  // useState Tutorial - PedroTech: O6P86uwfdR0
  await db.insert(lessons).values([
    {
      partId: part2_1.id, order: 1,
      title: 'Components và Props', titleEn: 'Components & Props',
      content: '## React Components\n\nComponent là khối xây dựng cơ bản của React. Mỗi component là một hàm trả về JSX.\n\n```jsx\nfunction Button({ label, onClick }) {\n  return <button onClick={onClick}>{label}</button>;\n}\n```\n\n**Props** là dữ liệu truyền từ component cha xuống component con.',
      contentEn: '## React Components\n\nComponents are the building blocks of React. Each component is a function returning JSX.\n\n```jsx\nfunction Button({ label, onClick }) {\n  return <button onClick={onClick}>{label}</button>;\n}\n```',
      youtubeId: 'w7ejDZ8SWv8',
      durationSec: 6240,
    },
    {
      partId: part2_1.id, order: 2,
      title: 'State và Hooks', titleEn: 'State & Hooks',
      content: '## useState Hook\n\nQuản lý state trong functional components.\n\n```jsx\nimport { useState } from "react";\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <div>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(count + 1)}>+1</button>\n    </div>\n  );\n}\n```',
      contentEn: '## useState Hook\n\nManage state in functional components.\n\n```jsx\nconst [count, setCount] = useState(0);\n```',
      youtubeId: 'O6P86uwfdR0',
      durationSec: 540,
    },
  ]);

  await db.insert(enrollments).values({ userId: student1.id, courseId: course1.id });

  console.log('Seed completed!');
  console.log('Admin:   admin@lms.local / Admin@123');
  console.log('Student: student1@lms.local / Student@123');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
