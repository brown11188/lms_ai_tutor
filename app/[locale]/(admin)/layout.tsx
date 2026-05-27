import { DesktopSidebar, MobileSidebar } from '@/components/shared/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <DesktopSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex lg:hidden h-14 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <MobileSidebar />
          <span className="text-sm font-semibold text-slate-700">LMS AI Tutor — Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
