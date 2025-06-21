'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/src/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  MessageSquare, 
  Video, 
  FileText, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Bell,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const quickActions = [
  {
    title: 'Начать конференцию',
    description: 'Создать новую видеоконференцию',
    icon: Video,
    href: '/conference/new',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    title: 'Отправить сообщение',
    description: 'Перейти в чат',
    icon: MessageSquare,
    href: '/chat',
    color: 'text-green-600 bg-green-50',
  },
  {
    title: 'Загрузить документ',
    description: 'Добавить новый документ',
    icon: FileText,
    href: '/documents/upload',
    color: 'text-purple-600 bg-purple-50',
  },
  {
    title: 'Контакты',
    description: 'Найти сотрудника',
    icon: Users,
    href: '/contacts',
    color: 'text-orange-600 bg-orange-50',
  },
];

// Icon mapping
const iconMap = {
  MessageSquare,
  Video,
  FileText,
  Users,
};

interface DashboardData {
  stats: Array<{
    name: string;
    value: string;
    icon: string;
    change: string;
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    action: string;
    time: string;
    icon: string;
  }>;
  upcomingEvents: Array<{
    id: string;
    time: string;
    title: string;
    type: string;
    duration: string;
  }>;
  unreadNotifications: number;
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Redirect admins to admin dashboard
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      router.push('/admin/dashboard');
    }
  }, [user, router]);

  const fetchDashboardData = useCallback(async (showRefreshIndicator = false) => {
    // Don't fetch for admins
    if (user?.role === 'ADMIN') return;
    
    try {
      if (showRefreshIndicator) setIsRefreshing(true);
      
      const response = await fetch('/api/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashboardData = await response.json();
      setData(dashboardData);
      setError(null);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError('Не удалось загрузить данные. Попробуйте обновить страницу.');
      toast.error('Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, user]);

  useEffect(() => {
    // Don't fetch data for admins
    if (user?.role === 'ADMIN') return;
    
    fetchDashboardData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [token, user]);

  // Don't fetch or render for admins
  if (user?.role === 'ADMIN') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-4">Перенаправление в админ-панель...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} час${hours === 1 ? '' : 'а'} назад`;
    return `${days} ${days === 1 ? 'день' : 'дня'} назад`;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96 mb-8" />
          
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => fetchDashboardData()} className="mt-4">
            Попробовать снова
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Welcome Section */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Добро пожаловать, {user?.name}!
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Сегодня {new Date().toLocaleDateString('ru-RU', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {data?.unreadNotifications && data.unreadNotifications > 0 && (
              <Link href="/notifications">
                <Button variant="outline" size="sm" className="relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {data.unreadNotifications}
                  </span>
                </Button>
              </Link>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {data?.stats.map((stat) => {
            const Icon = iconMap[stat.icon as keyof typeof iconMap] || Users;
            const isPositive = stat.change.startsWith('+');
            const TrendIcon = isPositive ? TrendingUp : TrendingDown;
            
            return (
              <Card key={stat.name}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {stat.name}
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <TrendIcon className={`h-4 w-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={`ml-2 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      с прошлой недели
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Быстрые действия
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${action.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {action.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {action.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Последняя активность</CardTitle>
              <CardDescription>Ваши недавние действия в системе</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.recentActivities.length === 0 ? (
                  <p className="text-sm text-gray-500">Нет недавней активности</p>
                ) : (
                  data?.recentActivities.map((item, index) => {
                    const Icon = iconMap[item.icon as keyof typeof iconMap] || MessageSquare;
                    return (
                      <div key={`${item.type}-${item.id}-${index}`} className="flex items-start space-x-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white">{item.action}</p>
                          <p className="text-xs text-gray-500 flex items-center mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTimeAgo(item.time)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle>Предстоящие события</CardTitle>
              <CardDescription>Ваше расписание на сегодня</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.upcomingEvents.length === 0 ? (
                  <p className="text-sm text-gray-500">Нет запланированных событий на сегодня</p>
                ) : (
                  data?.upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-center">
                          <p className="text-xs text-gray-500">время</p>
                          <p className="text-sm font-semibold">{event.time}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {event.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {event.type} {event.duration && `• ${event.duration}`}
                          </p>
                        </div>
                      </div>
                      <Link href={`/conference/${event.id}`}>
                        <Button variant="outline" size="sm">
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}