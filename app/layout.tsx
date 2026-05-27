import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LMS AI Tutor',
  description: 'Nền tảng học trực tuyến thông minh',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
