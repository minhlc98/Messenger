'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useWebSocketInit } from '@/hooks/useWebSocket';
import Sidebar from '@/components/sidebar/Sidebar';

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  // Khởi tạo WebSocket 1 lần duy nhất ở đây — không ở Sidebar
  useWebSocketInit();
  const pathname = usePathname();
  const isChatDetail = pathname !== '/chat' && pathname?.startsWith('/chat/');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className={`w-full md:w-80 flex-shrink-0 ${isChatDetail ? 'hidden md:flex' : 'flex'}`}>
        <Sidebar />
      </div>
      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden ${!isChatDetail ? 'hidden md:flex' : 'flex'}`}>
        {children}
      </main>
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.replace('/login');
    }
  }, [mounted, token, router]);

  // Chưa mount (SSR) → không render gì để tránh hydration mismatch
  if (!mounted) return null;

  // Đã mount mà không có token → đang redirect
  if (!token) return null;

  return <MainLayoutInner>{children}</MainLayoutInner>;
}
