'use client';

import type { ReactNode } from "react";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Header } from "@/components/layout/header";
import AuthWrapper from '../auth-wrapper';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthWrapper>
      <SidebarProvider>
        <Sidebar variant="inset" collapsible="icon">
          <SidebarNav />
        </Sidebar>
        <SidebarInset>
          <Header />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthWrapper>
  );
}
