
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'notifications'>('profile');
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-8">
       <div>
        <h1 className="font-headline text-3xl md:text-4xl">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and application preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar Navigation */}
        <Card className="lg:col-span-1">
            <CardContent className="p-2">
                <nav className="space-y-1">
                <Button
                    variant="ghost"
                    onClick={() => setActiveTab('profile')}
                    className={cn("w-full justify-start", activeTab === 'profile' && 'bg-muted')}
                >
                    Profile
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => setActiveTab('preferences')}
                     className={cn("w-full justify-start", activeTab === 'preferences' && 'bg-muted')}
                >
                    Preferences
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => setActiveTab('notifications')}
                    className={cn("w-full justify-start", activeTab === 'notifications' && 'bg-muted')}
                >
                    Notifications
                </Button>
                </nav>
            </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>This is how others will see you on the site.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" defaultValue="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="jane.doe@example.com" disabled />
                </div>
              </CardContent>
              <CardFooter>
                 <Button>Save Changes</Button>
              </CardFooter>
            </Card>
          )}

          {activeTab === 'preferences' && (
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize the look and feel of the application.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="theme-select" className="font-medium">Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose between light, dark, or system default.
                    </p>
                  </div>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-[180px]" id="theme-select">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                 <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-reports" className="font-medium">Email Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly summary reports via email.
                    </p>
                  </div>
                   <Switch id="email-reports" />
                </div>
              </CardContent>
               <CardFooter>
                 <Button>Save Preferences</Button>
              </CardFooter>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Manage how you receive notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="processing-complete" className="font-medium">Processing Complete</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify me when file processing is complete.
                    </p>
                  </div>
                  <Switch id="processing-complete" defaultChecked/>
                </div>
                 <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="anomaly-detection" className="font-medium">Anomaly Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify me when significant anomalies are detected.
                    </p>
                  </div>
                   <Switch id="anomaly-detection" defaultChecked/>
                </div>
              </CardContent>
              <CardFooter>
                 <Button>Save Notifications</Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
