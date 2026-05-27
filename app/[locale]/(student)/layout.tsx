import { DesktopSidebar, MobileSidebar } from '@/components/shared/Sidebar';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fb]">
      <DesktopSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header
          className="flex lg:hidden h-14 items-center gap-3 px-4 shrink-0"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e8ecf0',
          }}
        >
          <MobileSidebar />
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea6c0a)' }}
            >
              <span className="text-white text-xs font-bold">L</span>
            </div>
            <span className="text-sm font-bold text-slate-800">LMS AI Tutor</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
