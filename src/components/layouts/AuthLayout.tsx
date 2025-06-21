'use client';

import { ReactNode } from 'react';
import { Building2 } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export default function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 rounded-full bg-primary/10 mb-4">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-center">{title}</h1>
          {description && (
            <p className="text-muted-foreground text-center mt-2">{description}</p>
          )}
        </div>
        <div className="bg-card p-8 rounded-lg shadow-md border border-border">
          {children}
        </div>
      </div>
    </div>
  );
}