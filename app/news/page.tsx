'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/src/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Newspaper,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  TrendingUp,
  Megaphone,
  FileText,
  Building,
  Users,
  Briefcase,
  Clock,
  Send,
  ChevronRight,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  importance: 'HIGH' | 'NORMAL' | 'LOW';
  publishedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
    position?: string;
  };
  _count: {
    comments: number;
  };
  comments?: Comment[];
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    profileImage: string | null;
  };
}

const categories = [
  { value: 'all', label: 'Все категории', icon: Newspaper },
  { value: 'announcement', label: 'Объявления', icon: Megaphone },
  { value: 'policy', label: 'Политика и процедуры', icon: FileText },
  { value: 'department', label: 'Новости отделов', icon: Building },
  { value: 'hr', label: 'Кадровые новости', icon: Users },
  { value: 'projects', label: 'Проекты', icon: Briefcase },
];

const importanceConfig = {
  HIGH: { label: 'Важно', color: 'destructive', icon: AlertCircle },
  NORMAL: { label: 'Обычная', color: 'secondary', icon: TrendingUp },
  LOW: { label: 'Информация', color: 'outline', icon: FileText },
};

export default function NewsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedImportance, setSelectedImportance] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  // Form state for new news
  const [newNews, setNewNews] = useState({
    title: '',
    content: '',
    category: 'announcement',
    importance: 'NORMAL' as 'HIGH' | 'NORMAL' | 'LOW',
  });

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    filterNews();
  }, [news, searchQuery, selectedCategory, selectedImportance]);

  const fetchNews = async () => {
    try {
      const response = await fetch('/api/news', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNews(data);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
      toast.error('Не удалось загрузить новости');
    } finally {
      setIsLoading(false);
    }
  };

  const filterNews = () => {
    let filtered = [...news];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Importance filter
    if (selectedImportance !== 'all') {
      filtered = filtered.filter(item => item.importance === selectedImportance);
    }

    setFilteredNews(filtered);
  };

  const createNews = async () => {
    if (!newNews.title.trim() || !newNews.content.trim()) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    try {
      const response = await fetch('/api/news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newNews),
      });

      if (response.ok) {
        toast.success('Новость опубликована');
        setShowCreateDialog(false);
        setNewNews({
          title: '',
          content: '',
          category: 'announcement',
          importance: 'NORMAL',
        });
        await fetchNews();
      } else {
        toast.error('Не удалось опубликовать новость');
      }
    } catch (error) {
      console.error('Failed to create news:', error);
      toast.error('Произошла ошибка');
    }
  };

  const fetchNewsDetails = async (newsId: string) => {
    try {
      const response = await fetch(`/api/news/${newsId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedNews(data);
        setShowDetailsDialog(true);
      }
    } catch (error) {
      console.error('Failed to fetch news details:', error);
      toast.error('Не удалось загрузить детали новости');
    }
  };

  const postComment = async () => {
    if (!newComment.trim() || !selectedNews) return;

    try {
      const response = await fetch(`/api/news/${selectedNews.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        const comment = await response.json();
        setSelectedNews({
          ...selectedNews,
          comments: [...(selectedNews.comments || []), comment],
          _count: {
            ...selectedNews._count,
            comments: selectedNews._count.comments + 1,
          },
        });
        setNewComment('');
        toast.success('Комментарий добавлен');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      toast.error('Не удалось добавить комментарий');
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.icon : Newspaper;
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Новости и объявления
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Будьте в курсе последних событий компании
              </p>
            </div>
            
            {user?.role === 'ADMIN' && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Создать новость
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Новая публикация</DialogTitle>
                    <DialogDescription>
                      Создайте новость или объявление для сотрудников
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Заголовок</Label>
                      <Input
                        id="title"
                        placeholder="Введите заголовок новости"
                        value={newNews.title}
                        onChange={(e) =>
                          setNewNews({ ...newNews, title: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Содержание</Label>
                      <Textarea
                        id="content"
                        placeholder="Напишите текст новости..."
                        value={newNews.content}
                        onChange={(e) =>
                          setNewNews({ ...newNews, content: e.target.value })
                        }
                        rows={8}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Категория</Label>
                        <Select
                          value={newNews.category}
                          onValueChange={(value) =>
                            setNewNews({ ...newNews, category: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.slice(1).map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Важность</Label>
                        <Select
                          value={newNews.importance}
                          onValueChange={(value) =>
                            setNewNews({
                              ...newNews,
                              importance: value as 'HIGH' | 'NORMAL' | 'LOW',
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(importanceConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Отмена
                    </Button>
                    <Button onClick={createNews}>
                      Опубликовать
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Поиск новостей..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedImportance} onValueChange={setSelectedImportance}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Любая важность</SelectItem>
                {Object.entries(importanceConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* News Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка новостей...</p>
            </div>
          </div>
        ) : filteredNews.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Newspaper className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Новостей не найдено
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {searchQuery || selectedCategory !== 'all' || selectedImportance !== 'all'
                  ? 'Попробуйте изменить параметры поиска'
                  : 'Пока нет опубликованных новостей'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredNews.map((item) => {
              const CategoryIcon = getCategoryIcon(item.category);
              const importance = importanceConfig[item.importance];
              const ImportanceIcon = importance.icon;
              
              return (
                <Card
                  key={item.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => fetchNewsDetails(item.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CategoryIcon className="h-5 w-5 text-gray-400" />
                      <Badge variant={importance.color as any} className="gap-1">
                        <ImportanceIcon className="h-3 w-3" />
                        {importance.label}
                      </Badge>
                    </div>
                    <CardTitle className="line-clamp-2">{item.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {item.content}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={item.author.profileImage || undefined} />
                        <AvatarFallback>{item.author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{item.author.name}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{item._count.comments}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatDistanceToNow(new Date(item.publishedAt), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </span>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* News Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            {selectedNews && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={importanceConfig[selectedNews.importance].color as any}>
                      {importanceConfig[selectedNews.importance].label}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {format(new Date(selectedNews.publishedAt), 'd MMMM yyyy, HH:mm', {
                        locale: ru,
                      })}
                    </span>
                  </div>
                  <DialogTitle className="text-2xl">{selectedNews.title}</DialogTitle>
                  <div className="flex items-center space-x-3 text-sm text-gray-500">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedNews.author.profileImage || undefined} />
                      <AvatarFallback>{selectedNews.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedNews.author.name}
                      </p>
                      <p className="text-xs">{selectedNews.author.position}</p>
                    </div>
                  </div>
                </DialogHeader>
                
                <ScrollArea className="my-6 max-h-[400px]">
                  <div className="space-y-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{selectedNews.content}</p>
                    </div>
                    
                    <Separator className="my-6" />
                    
                    {/* Comments Section */}
                    <div>
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Комментарии ({selectedNews._count.comments})
                      </h3>
                      
                      {selectedNews.comments && selectedNews.comments.length > 0 ? (
                        <div className="space-y-4 mb-4">
                          {selectedNews.comments.map((comment) => (
                            <div key={comment.id} className="flex space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.author.profileImage || undefined} />
                                <AvatarFallback>
                                  {comment.author.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-baseline space-x-2">
                                  <span className="font-medium text-sm">
                                    {comment.author.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDistanceToNow(new Date(comment.createdAt), {
                                      addSuffix: true,
                                      locale: ru,
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mb-4">
                          Пока нет комментариев. Будьте первым!
                        </p>
                      )}
                      
                      {/* Add Comment */}
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Написать комментарий..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && postComment()}
                        />
                        <Button size="icon" onClick={postComment}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}