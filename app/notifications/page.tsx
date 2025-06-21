'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import DashboardLayout from '@/src/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Bell,
  BellOff,
  MessageSquare,
  FileText,
  Newspaper,
  Video,
  Users,
  Settings,
  Trash2,
  Check,
  CheckCheck,
  Filter,
  MoreVertical,
  Clock,
  AlertCircle,
  Info,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'SYSTEM' | 'MESSAGE' | 'NEWS' | 'DOCUMENT' | 'CONFERENCE' | 'USER';
  isRead: boolean;
  createdAt: string;
  relatedData?: {
    userId?: string;
    userName?: string;
    userImage?: string;
    newsId?: string;
    documentId?: string;
    conferenceId?: string;
    chatId?: string;
  };
}

const notificationIcons = {
  SYSTEM: Settings,
  MESSAGE: MessageSquare,
  NEWS: Newspaper,
  DOCUMENT: FileText,
  CONFERENCE: Video,
  USER: Users,
};

const notificationColors = {
  SYSTEM: 'text-gray-500 bg-gray-100',
  MESSAGE: 'text-blue-500 bg-blue-100',
  NEWS: 'text-purple-500 bg-purple-100',
  DOCUMENT: 'text-green-500 bg-green-100',
  CONFERENCE: 'text-red-500 bg-red-100',
  USER: 'text-orange-500 bg-orange-100',
};

export default function NotificationsPage() {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, selectedType]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Не удалось загрузить уведомления');
    } finally {
      setIsLoading(false);
    }
  };

  const filterNotifications = () => {
    if (selectedType === 'all') {
      setFilteredNotifications(notifications);
    } else if (selectedType === 'unread') {
      setFilteredNotifications(notifications.filter(n => !n.isRead));
    } else {
      setFilteredNotifications(notifications.filter(n => n.type === selectedType));
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await Promise.all(
        notificationIds.map(id =>
          fetch(`/api/notifications/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ isRead: true }),
          })
        )
      );

      setNotifications(
        notifications.map(n =>
          notificationIds.includes(n.id) ? { ...n, isRead: true } : n
        )
      );
      
      toast.success('Уведомления отмечены как прочитанные');
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      toast.error('Не удалось отметить уведомления');
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  };

  const deleteNotifications = async (notificationIds: string[]) => {
    try {
      await Promise.all(
        notificationIds.map(id =>
          fetch(`/api/notifications/${id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        )
      );

      setNotifications(notifications.filter(n => !notificationIds.includes(n.id)));
      setSelectedNotifications([]);
      
      toast.success('Уведомления удалены');
    } catch (error) {
      console.error('Failed to delete notifications:', error);
      toast.error('Не удалось удалить уведомления');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead([notification.id]);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'MESSAGE':
        if (notification.relatedData?.chatId) {
          window.location.href = `/chat?id=${notification.relatedData.chatId}`;
        }
        break;
      case 'NEWS':
        if (notification.relatedData?.newsId) {
          window.location.href = `/news?id=${notification.relatedData.newsId}`;
        }
        break;
      case 'DOCUMENT':
        if (notification.relatedData?.documentId) {
          window.location.href = `/documents?id=${notification.relatedData.documentId}`;
        }
        break;
      case 'CONFERENCE':
        if (notification.relatedData?.conferenceId) {
          window.location.href = `/conference/${notification.relatedData.conferenceId}`;
        }
        break;
    }
  };

  const toggleSelectNotification = (id: string) => {
    setSelectedNotifications(prev =>
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filteredNotifications.map(n => n.id);
    setSelectedNotifications(visibleIds);
  };

  const deselectAll = () => {
    setSelectedNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const stats = {
    total: notifications.length,
    unread: unreadCount,
    messages: notifications.filter(n => n.type === 'MESSAGE').length,
    news: notifications.filter(n => n.type === 'NEWS').length,
    documents: notifications.filter(n => n.type === 'DOCUMENT').length,
    conferences: notifications.filter(n => n.type === 'CONFERENCE').length,
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Уведомления
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Все ваши уведомления в одном месте
              </p>
            </div>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-lg px-3 py-1">
                {unreadCount} новых
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Сообщения</p>
                  <p className="text-2xl font-semibold">{stats.messages}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Новости</p>
                  <p className="text-2xl font-semibold">{stats.news}</p>
                </div>
                <Newspaper className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Документы</p>
                  <p className="text-2xl font-semibold">{stats.documents}</p>
                </div>
                <FileText className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Конференции</p>
                  <p className="text-2xl font-semibold">{stats.conferences}</p>
                </div>
                <Video className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        {selectedNotifications.length > 0 && (
          <Card className="mb-4 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedNotifications.length === filteredNotifications.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      selectAllVisible();
                    } else {
                      deselectAll();
                    }
                  }}
                />
                <span className="text-sm text-gray-600">
                  Выбрано: {selectedNotifications.length}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAsRead(selectedNotifications)}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Прочитать
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteNotifications(selectedNotifications)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all">
                Все ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Непрочитанные ({stats.unread})
              </TabsTrigger>
              <TabsTrigger value="MESSAGE">Сообщения</TabsTrigger>
              <TabsTrigger value="NEWS">Новости</TabsTrigger>
              <TabsTrigger value="DOCUMENT">Документы</TabsTrigger>
              <TabsTrigger value="CONFERENCE">Конференции</TabsTrigger>
            </TabsList>
            
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Прочитать все
              </Button>
            )}
          </div>

          <TabsContent value={selectedType} className="mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">
                    Загрузка уведомлений...
                  </p>
                </div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <Card className="p-12">
                <div className="text-center">
                  <BellOff className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                    Нет уведомлений
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {selectedType === 'unread'
                      ? 'У вас нет непрочитанных уведомлений'
                      : 'В этой категории пока нет уведомлений'}
                  </p>
                </div>
              </Card>
            ) : (
              <Card>
                <ScrollArea className="h-[600px]">
                  <div className="divide-y">
                    {filteredNotifications.map((notification) => {
                      const Icon = notificationIcons[notification.type];
                      const colorClass = notificationColors[notification.type];
                      const isSelected = selectedNotifications.includes(notification.id);

                      return (
                        <div
                          key={notification.id}
                          className={cn(
                            'p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors',
                            !notification.isRead && 'bg-blue-50 dark:bg-blue-950/20',
                            isSelected && 'bg-gray-100 dark:bg-gray-800'
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start space-x-4">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectNotification(notification.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className={cn('p-2 rounded-lg', colorClass)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <p className={cn(
                                    'font-medium',
                                    !notification.isRead && 'text-gray-900 dark:text-white'
                                  )}>
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {notification.content}
                                  </p>
                                  {notification.relatedData?.userName && (
                                    <div className="flex items-center space-x-2 mt-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={notification.relatedData.userImage} />
                                        <AvatarFallback>
                                          {notification.relatedData.userName.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm text-gray-500">
                                        {notification.relatedData.userName}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-2 mt-2">
                                    <Clock className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      {formatDistanceToNow(new Date(notification.createdAt), {
                                        addSuffix: true,
                                        locale: ru,
                                      })}
                                    </span>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {!notification.isRead && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            markAsRead([notification.id]);
                                          }}
                                        >
                                          <Check className="h-4 w-4 mr-2" />
                                          Отметить как прочитанное
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                      </>
                                    )}
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotifications([notification.id]);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Удалить
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}