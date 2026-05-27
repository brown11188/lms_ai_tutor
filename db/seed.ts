import { db } from './index';
import { users, courses, parts, lessons, enrollments, quizzes, assignments } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding database...');

  // Idempotent: skip if admin already exists
  const existing = await db.select().from(users).where(eq(users.email, 'admin@lms.local')).limit(1);
  if (existing.length > 0) {
    console.log('Seed already applied, skipping.');
    process.exit(0);
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

  const [lesson1] = await db.insert(lessons).values({
    partId: part1_1.id, order: 1,
    title: 'JavaScript là gì?', titleEn: 'What is JavaScript?',
    content: '## JavaScript là gì?\n\nJavaScript là ngôn ngữ lập trình phổ biến nhất thế giới, chạy trên trình duyệt và máy chủ (Node.js).',
    contentEn: '## What is JavaScript?\n\nJavaScript is the most popular programming language in the world, running in browsers and on servers (Node.js).',
    youtubeId: 'hdI2bqOjy3c',
    durationSec: 300,
  }).returning();

  const [lesson2] = await db.insert(lessons).values({
    partId: part1_1.id, order: 2,
    title: 'Biến và kiểu dữ liệu', titleEn: 'Variables & Data Types',
    content: '## Biến trong JavaScript\n\nSử dụng `let`, `const`, `var` để khai báo biến.\n\n- `let`: có thể thay đổi\n- `const`: không thay đổi\n- `var`: tránh dùng trong code hiện đại',
    contentEn: '## Variables in JavaScript\n\nUse `let`, `const`, `var` to declare variables.',
    youtubeId: 'edlFjlzxkSI',
    durationSec: 480,
  }).returning();

  await db.insert(lessons).values({
    partId: part1_2.id, order: 1,
    title: 'Hàm trong JavaScript', titleEn: 'Functions in JavaScript',
    content: '## Hàm (Function)\n\nHàm là khối code có thể tái sử dụng.\n\n```js\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n```',
    contentEn: '## Functions\n\nFunctions are reusable blocks of code.',
    youtubeId: 'N8ap4k_1QEQ',
    durationSec: 420,
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

  await db.insert(lessons).values([
    {
      partId: part2_1.id, order: 1,
      title: 'Components và Props', titleEn: 'Components & Props',
      content: '## React Components\n\nComponent là khối xây dựng cơ bản của React. Mỗi component là một hàm trả về JSX.',
      youtubeId: 'Tn6-PIqc4UM',
      durationSec: 600,
    },
    {
      partId: part2_1.id, order: 2,
      title: 'State và Hooks', titleEn: 'State & Hooks',
      content: '## useState Hook\n\nQuản lý state trong functional components.\n\n```jsx\nconst [count, setCount] = useState(0);\n```',
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
