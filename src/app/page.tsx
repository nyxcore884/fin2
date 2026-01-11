'use client';

import { useUser } from '@/firebase/firebase';
import { Loader } from 'lucide-react';
import { redirect, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}
