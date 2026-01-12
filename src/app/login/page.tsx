'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleAuthAction = async (action: 'signIn' | 'signUp') => {
    setIsSubmitting(true);
    try {
      if (action === 'signIn') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      toast({
        title: action === 'signIn' ? 'Login Successful' : 'Signup Successful',
        description: "You are now being redirected to your dashboard.",
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg border">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground">Enter your credentials to access your dashboard</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <div className="flex flex-col space-y-4">
           <Button 
            onClick={() => handleAuthAction('signIn')} 
            disabled={isSubmitting || !email || !password}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </Button>
           <Button 
            variant="outline" 
            onClick={() => handleAuthAction('signUp')} 
            disabled={isSubmitting || !email || !password}
          >
            {isSubmitting ? 'Signing Up...' : 'Sign Up'}
          </Button>
        </div>
      </div>
    </div>
  );
}
