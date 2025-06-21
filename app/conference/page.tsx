'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/src/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Video,
  Plus,
  Users,
  Calendar,
  Clock,
  Link,
  Copy,
  CheckCircle,
  Search,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

interface Conference {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  participants: {
    user: {
      id: string;
      name: string;
      email: string;
      profileImage: string | null;
    };
    isHost: boolean;
  }[];
  _count: {
    participants: number;
  };
}

export default function ConferencePage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Form state for new conference
  const [newConference, setNewConference] = useState({
    title: '',
    description: '',
    startTime: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    fetchConferences();
  }, []);

  const fetchConferences = async () => {
    try {
      const response = await fetch('/api/conference', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConferences(data);
      }
    } catch (error) {
      console.error('Failed to fetch conferences:', error);
      toast.error('Не удалось загрузить конференции');
    } finally {
      setLoading(false);
    }
  };

  const createConference = async () => {
    try {
      const response = await fetch('/api/conference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newConference,
          startTime: new Date(newConference.startTime).toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Конференция создана успешно');
        setShowCreateDialog(false);
        setNewConference({
          title: '',
          description: '',
          startTime: new Date().toISOString().slice(0, 16),
        });
        // Переход к созданной конференции
        router.push(`/conference/${data.id}`);
      } else {
        toast.error('Не удалось создать конференцию');
      }
    } catch (error) {
      console.error('Failed to create conference:', error);
      toast.error('Произошла ошибка при создании конференции');
    }
  };

  const joinConference = (conferenceId: string) => {
    router.push(`/conference/${conferenceId}`);
  };

  const copyLink = (conferenceId: string) => {
    const link = `${window.location.origin}/conference/${conferenceId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(conferenceId);
    toast.success('Ссылка скопирована');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredConferences = conferences.filter((conf) =>
    conf.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conf.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConferences = filteredConferences.filter((conf) => conf.isActive);
  const upcomingConferences = filteredConferences.filter(
    (conf) => !conf.isActive && new Date(conf.startTime) > new Date()
  );
  const pastConferences = filteredConferences.filter(
    (conf) => !conf.isActive && new Date(conf.startTime) <= new Date()
  );

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Видеоконференции
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Управляйте видеовстречами и конференциями
              </p>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Создать конференцию
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Новая конференция</DialogTitle>
                  <DialogDescription>
                    Создайте новую видеоконференцию для вашей команды
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Название</Label>
                    <Input
                      id="title"
                      placeholder="Например: Планерка отдела"
                      value={newConference.title}
                      onChange={(e) =>
                        setNewConference({ ...newConference, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Описание (необязательно)</Label>
                    <Textarea
                      id="description"
                      placeholder="Опишите цель встречи..."
                      value={newConference.description}
                      onChange={(e) =>
                        setNewConference({ ...newConference, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Время начала</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={newConference.startTime}
                      onChange={(e) =>
                        setNewConference({ ...newConference, startTime: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Отмена
                  </Button>
                  <Button
                    onClick={createConference}
                    disabled={!newConference.title}
                  >
                    Создать
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Поиск конференций..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка конференций...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Conferences */}
            {activeConferences.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  Активные конференции
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeConferences.map((conference) => (
                    <ConferenceCard
                      key={conference.id}
                      conference={conference}
                      onJoin={() => joinConference(conference.id)}
                      onCopyLink={() => copyLink(conference.id)}
                      copied={copiedId === conference.id}
                      isActive
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Conferences */}
            {upcomingConferences.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Предстоящие конференции
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingConferences.map((conference) => (
                    <ConferenceCard
                      key={conference.id}
                      conference={conference}
                      onJoin={() => joinConference(conference.id)}
                      onCopyLink={() => copyLink(conference.id)}
                      copied={copiedId === conference.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past Conferences */}
            {pastConferences.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Прошедшие конференции
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pastConferences.map((conference) => (
                    <ConferenceCard
                      key={conference.id}
                      conference={conference}
                      onJoin={() => joinConference(conference.id)}
                      onCopyLink={() => copyLink(conference.id)}
                      copied={copiedId === conference.id}
                      isPast
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredConferences.length === 0 && (
              <Card className="p-12">
                <div className="text-center">
                  <Video className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                    Конференций не найдено
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {searchQuery
                      ? 'Попробуйте изменить поисковый запрос'
                      : 'Создайте новую конференцию, чтобы начать'}
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Conference Card Component
function ConferenceCard({
  conference,
  onJoin,
  onCopyLink,
  copied,
  isActive = false,
  isPast = false,
}: {
  conference: Conference;
  onJoin: () => void;
  onCopyLink: () => void;
  copied: boolean;
  isActive?: boolean;
  isPast?: boolean;
}) {
  const host = conference.participants.find((p) => p.isHost);

  return (
    <Card className={`h-full ${isActive ? 'border-green-500 shadow-lg' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{conference.title}</CardTitle>
            {conference.description && (
              <CardDescription className="line-clamp-2">
                {conference.description}
              </CardDescription>
            )}
          </div>
          {isActive && (
            <Badge variant="default" className="bg-green-500">
              Активна
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(conference.startTime), 'd MMM', { locale: ru })}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {format(new Date(conference.startTime), 'HH:mm')}
          </div>
        </div>

        {/* Host */}
        {host && (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={host.user.profileImage || undefined} />
              <AvatarFallback className="text-xs">
                {host.user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Организатор: {host.user.name}
            </span>
          </div>
        )}

        {/* Participants */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <Users className="h-4 w-4" />
            {conference._count.participants} участников
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant={isPast ? 'outline' : 'default'}
            onClick={onJoin}
          >
            {isActive ? 'Присоединиться' : isPast ? 'Просмотреть' : 'Открыть'}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onCopyLink}
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Link className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}