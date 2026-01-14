'use client';

import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

// Dynamically import client-side only components
const AuthProvider = dynamic(() => import('@/hooks/use-auth').then(mod => mod.AuthProvider), { ssr: false });
const FloatingAIChat = dynamic(() => import('@/components/FloatingAIChat'), { ssr: false });

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
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
  );
}
