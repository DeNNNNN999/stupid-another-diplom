import React from 'react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  users: string[];
  className?: string;
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const message = users.length === 1
    ? `${users[0]} печатает...`
    : users.length === 2
    ? `${users[0]} и ${users[1]} печатают...`
    : `${users[0]} и еще ${users.length - 1} печатают...`;

  return (
    <div className={cn(
      "flex items-center space-x-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg animate-pulse",
      className
    )}>
      <div className="flex space-x-1">
        <span 
          className="inline-block w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span 
          className="inline-block w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span 
          className="inline-block w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span className="font-medium">{message}</span>
    </div>
  );
}