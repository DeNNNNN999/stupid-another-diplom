import React from 'react';
import { cn } from '@/lib/utils';

interface UserStatusProps {
  isOnline: boolean;
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  lastSeen?: string;
  variant?: 'dot' | 'badge';
}

export function UserStatus({ 
  isOnline, 
  className, 
  showText = false, 
  size = 'md',
  lastSeen,
  variant = 'dot'
}: UserStatusProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const getStatusText = () => {
    if (!showText) return null;
    
    if (isOnline) {
      return "В сети";
    }
    
    if (lastSeen) {
      const lastSeenDate = new Date(lastSeen);
      const now = new Date();
      const diffMs = now.getTime() - lastSeenDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return "только что";
      if (diffMins < 60) return `${diffMins} мин назад`;
      if (diffHours < 24) return `${diffHours} час${diffHours === 1 ? '' : 'а'} назад`;
      if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'день' : 'дня'} назад`;
      return lastSeenDate.toLocaleDateString('ru-RU');
    }
    
    return "Не в сети";
  };

  if (variant === 'badge') {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        isOnline 
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        className
      )}>
        <div className="relative">
          <div
            className={cn(
              sizeClasses[size],
              "rounded-full",
              isOnline ? "bg-green-500" : "bg-gray-400"
            )}
          />
          {isOnline && (
            <div className={cn(
              "absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75",
              sizeClasses[size]
            )} />
          )}
        </div>
        {getStatusText()}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", className)}>
      <div className="relative">
        <div
          className={cn(
            sizeClasses[size],
            "rounded-full border-2 border-white dark:border-gray-800",
            isOnline ? "bg-green-500" : "bg-gray-400"
          )}
        />
        {isOnline && (
          <div className={cn(
            "absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75",
            sizeClasses[size]
          )} />
        )}
      </div>
      {showText && (
        <span className={cn(
          "ml-2 font-medium",
          textSizeClasses[size],
          isOnline ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
        )}>
          {getStatusText()}
        </span>
      )}
    </div>
  );
}