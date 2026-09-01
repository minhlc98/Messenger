'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useWebSocketInit } from '@/hooks/useWebSocket';
import Sidebar from '@/components/sidebar/Sidebar';

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  // Khởi tạo WebSocket 1 lần duy nhất ở đây — không ở Sidebar
  useWebSocketInit();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
