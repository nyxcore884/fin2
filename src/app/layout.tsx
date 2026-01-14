'use client';

import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import dynamic from 'next/dynamic';

// Dynamic import for client-only component is now safe
const FloatingAIChat = dynamic(() => import('@/components/FloatingAIChat'), {
  ssr: false,
});

// Metadata is still correctly processed by Next.js at build time
export const metadata: Metadata = {
  title: 'Budget Insights',
  description: 'AI-powered financial analysis and reporting',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster />
          <FloatingAIChat />
        </ThemeProvider>
      </body>
    </html>
  );
}
