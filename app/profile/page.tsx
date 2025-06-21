'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import DashboardLayout from '@/src/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Camera,
  Lock,
  Bell,
  Settings,
  Shield,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const profileSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  email: z.string().email('Неверный формат email'),
  phoneNumber: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  bio: z.string().max(500, 'Максимум 500 символов').optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: z.string().min(8, 'Пароль должен содержать минимум 8 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, token, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification settings
  const [notifications, setNotifications] = useState({
    email: {
      messages: true,
      news: true,
      documents: false,
      conferences: true,
    },
    push: {
      messages: true,
      news: false,
      documents: false,
      conferences: true,
    },
  });

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
      department: user?.department || '',
      position: user?.position || '',
      bio: '',
    },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onProfileSubmit = async (values: ProfileValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        updateUser(updatedUser);
        toast.success('Профиль успешно обновлен');
      } else {
        toast.error('Не удалось обновить профиль');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Произошла ошибка при обновлении профиля');
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (values: PasswordValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      if (response.ok) {
        toast.success('Пароль успешно изменен');
        setShowPasswordDialog(false);
        passwordForm.reset();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Не удалось изменить пароль');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('Произошла ошибка при изменении пароля');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 5 МБ');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/profile/photo', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        updateUser({ profileImage: data.profileImage });
        toast.success('Фото профиля обновлено');
      } else {
        toast.error('Не удалось загрузить фото');
      }
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast.error('Произошла ошибка при загрузке фото');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      const response = await fetch('/api/profile/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(notifications),
      });

      if (response.ok) {
        toast.success('Настройки уведомлений сохранены');
      } else {
        toast.error('Не удалось сохранить настройки');
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      toast.error('Произошла ошибка при сохранении настроек');
    }
  };

  const userInitials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'NN';

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Профиль
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Управляйте своей учетной записью и настройками
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Общее</TabsTrigger>
            <TabsTrigger value="security">Безопасность</TabsTrigger>
            <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            {/* Profile Photo */}
            <Card>
              <CardHeader>
                <CardTitle>Фото профиля</CardTitle>
                <CardDescription>
                  Загрузите фотографию для вашего профиля
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user?.profileImage || undefined} />
                    <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Загрузка...
                        </>
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" />
                          Изменить фото
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500">
                      JPG, PNG или GIF. Максимум 5 МБ.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Личная информация</CardTitle>
                <CardDescription>
                  Обновите вашу личную информацию
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Полное имя</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" disabled />
                            </FormControl>
                            <FormDescription>
                              Email изменить нельзя
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Телефон</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="+7 (999) 123-45-67" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Должность</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Например: Старший аналитик" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Отдел</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите отдел" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="management">Руководство</SelectItem>
                              <SelectItem value="it">ИТ отдел</SelectItem>
                              <SelectItem value="hr">Отдел кадров</SelectItem>
                              <SelectItem value="finance">Финансовый отдел</SelectItem>
                              <SelectItem value="legal">Юридический отдел</SelectItem>
                              <SelectItem value="analytics">Аналитический отдел</SelectItem>
                              <SelectItem value="support">Отдел поддержки</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>О себе</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Расскажите немного о себе..."
                              rows={4}
                            />
                          </FormControl>
                          <FormDescription>
                            Максимум 500 символов
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Сохранение...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Сохранить изменения
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle>Информация об аккаунте</CardTitle>
                <CardDescription>
                  Детали вашей учетной записи
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Роль в системе</p>
                    <p className="text-sm text-gray-500">
                      Уровень доступа к функциям системы
                    </p>
                  </div>
                  <Badge variant={user?.role === 'ADMIN' ? 'destructive' : 'secondary'}>
                    {user?.role === 'ADMIN' ? 'Администратор' : 'Сотрудник'}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Дата регистрации</p>
                    <p className="text-sm text-gray-500">
                      Когда вы присоединились к системе
                    </p>
                  </div>
                  <p className="text-sm">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : 'Не указано'}
                  </p>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">ID пользователя</p>
                    <p className="text-sm text-gray-500">
                      Уникальный идентификатор
                    </p>
                  </div>
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {user?.id}
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Безопасность</CardTitle>
                <CardDescription>
                  Управляйте настройками безопасности вашего аккаунта
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Пароль</p>
                    <p className="text-sm text-gray-500">
                      Регулярно меняйте пароль для безопасности
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
                    <Lock className="mr-2 h-4 w-4" />
                    Изменить пароль
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Двухфакторная аутентификация</p>
                    <p className="text-sm text-gray-500">
                      Дополнительный уровень защиты для вашего аккаунта
                    </p>
                  </div>
                  <Badge variant="outline">Скоро</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Активные сессии</p>
                    <p className="text-sm text-gray-500">
                      Управляйте устройствами, с которых вы вошли
                    </p>
                  </div>
                  <Button variant="outline" disabled>
                    Управлять сессиями
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email уведомления</CardTitle>
                <CardDescription>
                  Выберите, какие уведомления вы хотите получать по email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-messages">Новые сообщения</Label>
                    <p className="text-sm text-gray-500">
                      Уведомления о новых личных сообщениях
                    </p>
                  </div>
                  <Switch
                    id="email-messages"
                    checked={notifications.email.messages}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        email: { ...notifications.email, messages: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-news">Новости компании</Label>
                    <p className="text-sm text-gray-500">
                      Важные объявления и новости
                    </p>
                  </div>
                  <Switch
                    id="email-news"
                    checked={notifications.email.news}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        email: { ...notifications.email, news: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-documents">Новые документы</Label>
                    <p className="text-sm text-gray-500">
                      Уведомления о новых документах в вашем отделе
                    </p>
                  </div>
                  <Switch
                    id="email-documents"
                    checked={notifications.email.documents}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        email: { ...notifications.email, documents: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-conferences">Приглашения на конференции</Label>
                    <p className="text-sm text-gray-500">
                      Уведомления о предстоящих встречах
                    </p>
                  </div>
                  <Switch
                    id="email-conferences"
                    checked={notifications.email.conferences}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        email: { ...notifications.email, conferences: checked },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Push-уведомления</CardTitle>
                <CardDescription>
                  Мгновенные уведомления в браузере
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-messages">Новые сообщения</Label>
                    <p className="text-sm text-gray-500">
                      Мгновенные уведомления о сообщениях
                    </p>
                  </div>
                  <Switch
                    id="push-messages"
                    checked={notifications.push.messages}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        push: { ...notifications.push, messages: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-conferences">Начало конференций</Label>
                    <p className="text-sm text-gray-500">
                      Напоминания о начале встреч
                    </p>
                  </div>
                  <Switch
                    id="push-conferences"
                    checked={notifications.push.conferences}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        push: { ...notifications.push, conferences: checked },
                      })
                    }
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={saveNotificationSettings} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Сохранить настройки уведомлений
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Password Change Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Изменение пароля</DialogTitle>
              <DialogDescription>
                Введите текущий пароль и новый пароль
              </DialogDescription>
            </DialogHeader>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Текущий пароль</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Новый пароль</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormDescription>
                        Минимум 8 символов
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Подтвердите новый пароль</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordDialog(false);
                      passwordForm.reset();
                    }}
                  >
                    Отмена
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Изменение...
                      </>
                    ) : (
                      'Изменить пароль'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}