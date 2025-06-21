'use client';

import { useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/src/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Video,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Zap,
  Shield,
  Copy,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NewConferencePage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [conferenceType, setConferenceType] = useState<'instant' | 'scheduled'>('instant');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [duration, setDuration] = useState('60');
  const [isRecording, setIsRecording] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState('100');

  const handleCreateConference = async () => {
    if (!title.trim()) {
      toast.error('Введите название конференции');
      return;
    }

    setIsLoading(true);
    try {
      const startTime = conferenceType === 'instant' 
        ? new Date().toISOString()
        : new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${selectedTime}`).toISOString();

      const response = await fetch('/api/conference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          startTime,
          settings: {
            recording: isRecording,
            waitingRoom,
            maxParticipants: parseInt(maxParticipants),
            duration: parseInt(duration),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Конференция создана успешно');
        
        if (conferenceType === 'instant') {
          // Сразу переходим в конференцию
          router.push(`/conference/${data.id}`);
        } else {
          // Показываем информацию о созданной конференции
          router.push(`/conference?created=${data.id}`);
        }
      } else {
        toast.error('Не удалось создать конференцию');
      }
    } catch (error) {
      console.error('Failed to create conference:', error);
      toast.error('Произошла ошибка при создании конференции');
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomTitle = () => {
    const titles = [
      'Рабочая встреча',
      'Планерка команды',
      'Обсуждение проекта',
      'Совещание отдела',
      'Брифинг',
      'Синхронизация по задачам',
    ];
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    setTitle(`${randomTitle} - ${format(new Date(), 'd MMM', { locale: ru })}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Создать конференцию
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Начните видеовстречу прямо сейчас или запланируйте на будущее
          </p>
        </div>

        {/* Conference Type Selection */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <RadioGroup
              value={conferenceType}
              onValueChange={(value) => setConferenceType(value as 'instant' | 'scheduled')}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="relative">
                <RadioGroupItem
                  value="instant"
                  id="instant"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="instant"
                  className={cn(
                    'flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer transition-all',
                    'hover:border-primary peer-checked:border-primary peer-checked:bg-primary/5'
                  )}
                >
                  <Zap className="h-8 w-8 mb-3 text-primary" />
                  <span className="text-lg font-semibold">Мгновенная конференция</span>
                  <span className="text-sm text-gray-500 text-center mt-2">
                    Начать видеовстречу прямо сейчас
                  </span>
                </Label>
              </div>
              
              <div className="relative">
                <RadioGroupItem
                  value="scheduled"
                  id="scheduled"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="scheduled"
                  className={cn(
                    'flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer transition-all',
                    'hover:border-primary peer-checked:border-primary peer-checked:bg-primary/5'
                  )}
                >
                  <CalendarIcon className="h-8 w-8 mb-3 text-primary" />
                  <span className="text-lg font-semibold">Запланированная</span>
                  <span className="text-sm text-gray-500 text-center mt-2">
                    Назначить встречу на определенное время
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Conference Details */}
        <Card>
          <CardHeader>
            <CardTitle>Детали конференции</CardTitle>
            <CardDescription>
              Заполните основную информацию о встрече
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Название конференции</Label>
              <div className="flex space-x-2">
                <Input
                  id="title"
                  placeholder="Например: Еженедельная планерка"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={generateRandomTitle}
                  title="Сгенерировать название"
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Описание (необязательно)</Label>
              <Textarea
                id="description"
                placeholder="Опишите цель встречи, повестку дня..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Date & Time for scheduled conferences */}
            {conferenceType === 'scheduled' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Дата</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !selectedDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, 'dd MMMM yyyy', { locale: ru })
                        ) : (
                          <span>Выберите дату</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Время</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return ['00', '30'].map((minute) => (
                          <SelectItem key={`${hour}:${minute}`} value={`${hour}:${minute}`}>
                            {hour}:{minute}
                          </SelectItem>
                        ));
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Продолжительность</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 минут</SelectItem>
                  <SelectItem value="45">45 минут</SelectItem>
                  <SelectItem value="60">1 час</SelectItem>
                  <SelectItem value="90">1.5 часа</SelectItem>
                  <SelectItem value="120">2 часа</SelectItem>
                  <SelectItem value="180">3 часа</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Настройки безопасности</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="waiting-room">Зал ожидания</Label>
                  <p className="text-sm text-gray-500">
                    Участники должны получить разрешение на вход
                  </p>
                </div>
                <Switch
                  id="waiting-room"
                  checked={waitingRoom}
                  onCheckedChange={setWaitingRoom}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="recording">Запись конференции</Label>
                  <p className="text-sm text-gray-500">
                    Автоматически записывать встречу
                  </p>
                </div>
                <Switch
                  id="recording"
                  checked={isRecording}
                  onCheckedChange={setIsRecording}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-participants">Максимум участников</Label>
                <Select value={maxParticipants} onValueChange={setMaxParticipants}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 участников</SelectItem>
                    <SelectItem value="25">25 участников</SelectItem>
                    <SelectItem value="50">50 участников</SelectItem>
                    <SelectItem value="100">100 участников</SelectItem>
                    <SelectItem value="200">200 участников</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4 mt-6">
          <Button
            variant="outline"
            onClick={() => router.push('/conference')}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button
            onClick={handleCreateConference}
            disabled={isLoading || !title.trim()}
            className="gap-2"
          >
            {isLoading ? (
              <>Создание...</>
            ) : conferenceType === 'instant' ? (
              <>
                <Video className="h-4 w-4" />
                Начать сейчас
              </>
            ) : (
              <>
                <CalendarIcon className="h-4 w-4" />
                Запланировать
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}