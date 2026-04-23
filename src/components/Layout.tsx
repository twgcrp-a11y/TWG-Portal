/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  UserCircle, 
  GitBranch, 
  BarChart3, 
  TrendingUp,
  Search,
  Menu,
  X,
  LogOut,
  UserCog,
  MonitorDot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { signInWithGoogle, auth } from '@/src/lib/firebase';
import { signOut } from 'firebase/auth';
import { Button, buttonVariants } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Clients', href: '/clients' },
  { icon: Briefcase, label: 'Job Openings', href: '/jobs' },
  { icon: UserCircle, label: 'Candidates', href: '/candidates' },
  { icon: GitBranch, label: 'Pipeline', href: '/pipeline' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
  { icon: TrendingUp, label: 'Performance', href: '/performance' },
  { icon: UserCog, label: 'Recruiters', href: '/recruiters', adminOnly: true },
  { icon: MonitorDot, label: 'TWG Portal', href: '/twg-portal' },
];

export function Sidebar({ className }: { className?: string }) {
  const location = useLocation();
  const { user } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (!user) return false;
    if (item.adminOnly && user.role !== 'Admin') return false;
    if (user.role === 'Admin' || user.role === 'Recruiter') return true;
    if (user.role === 'HiringManager') {
      return ['/', '/jobs', '/pipeline'].includes(item.href);
    }
    return false;
  });

  return (
    <div className={cn("pb-12 h-full border-r bg-slate-950 text-slate-300 border-slate-800", className)}>
      <div className="space-y-4 py-4">
        <div className="px-6 py-4 flex items-center justify-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">Rozgaar</span>
          </Link>
        </div>
        <Separator className="bg-slate-800" />
        <div className="px-3 py-2">
          <div className="space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Button
                  key={item.href}
                  render={<Link to={item.href} />}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 transition-colors",
                    isActive 
                      ? "bg-slate-800 text-white hover:bg-slate-800/90" 
                      : "hover:bg-slate-800/50 hover:text-white text-slate-400"
                  )}
                  nativeButton={false}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-green-500" : "text-amber-500")} />
                  <span className={isActive ? "font-semibold" : "font-medium"}>{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4 md:gap-8 flex-1">
          <div className="relative w-full max-w-md hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search candidates, jobs, clients..."
              className="w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Sheet>
            <SheetTrigger className={buttonVariants({ variant: "ghost", size: "icon", className: "md:hidden" })}>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="text-sm text-right hidden md:block">
                <p className="font-medium leading-none">{user.displayName}</p>
                <p className="text-xs text-muted-foreground mt-1">{user.role}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => signOut(auth)}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button onClick={signInWithGoogle}>Sign In</Button>
          )}
        </div>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user?.role === 'Guest') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4 text-center">
        <div className="max-w-md space-y-6 bg-background p-8 rounded-xl shadow-sm border">
          <div className="mx-auto w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
            <UserCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Pending Approval</h1>
          <p className="text-muted-foreground">
            Your account has been created, but you need an invitation from an Administrator to access the Rozgaar platform.
          </p>
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please contact your team administrator.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => signOut(auth)}>
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden md:block w-64 fixed inset-y-0" />
      <div className="flex-1 md:ml-64 flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
