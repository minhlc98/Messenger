import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChatApp',
  description: 'Real-time chat application',
};

import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        {children}
        <Toaster position="top-right" duration={3000} richColors />
      </body>
    </html>
  );
}
