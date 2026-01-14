'use client';

import dynamic from 'next/dynamic';

const FloatingAIChat = dynamic(() => import('./FloatingAIChat'), {
  ssr: false,
});

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <FloatingAIChat />
        </>
    );
}
