'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import DashboardLayout from '@/src/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Upload,
  Download,
  Search,
  Filter,
  FolderOpen,
  File,
  FileSpreadsheet,
  FileImage,
  FilePlus,
  MoreVertical,
  Clock,
  User,
  Calendar,
  HardDrive,
  Eye,
  Share2,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileArchive,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  title: string;
  description: string | null;
  filename: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  category: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  uploader: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
  };
  previousVersion?: {
    id: string;
    version: number;
  };
  nextVersion?: {
    id: string;
    version: number;
  };
}

const categories = [
  { value: 'all', label: 'Все категории', icon: FolderOpen },
  { value: 'regulations', label: 'Регламенты', icon: FileText },
  { value: 'templates', label: 'Шаблоны', icon: FilePlus },
  { value: 'reports', label: 'Отчеты', icon: FileSpreadsheet },
  { value: 'presentations', label: 'Презентации', icon: FileImage },
  { value: 'other', label: 'Прочее', icon: File },
];

const fileTypeIcons: { [key: string]: any } = {
  'application/pdf': FileText,
  'application/vnd.ms-excel': FileSpreadsheet,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'image/jpeg': FileImage,
  'image/png': FileImage,
  'application/zip': FileArchive,
  'application/x-zip-compressed': FileArchive,
};

export default function DocumentsPage() {
  const { user, token } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'other',
    file: null as File | null,
    isNewVersion: false,
    previousVersionId: '',
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    filterAndSortDocuments();
  }, [documents, searchQuery, selectedCategory, sortBy]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Не удалось загрузить документы');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortDocuments = () => {
    let filtered = [...documents];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        doc =>
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.title.localeCompare(b.title);
        case 'size':
          return b.fileSize - a.fileSize;
        default:
          return 0;
      }
    });

    setFilteredDocuments(filtered);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm({
        ...uploadForm,
        file,
        title: uploadForm.title || file.name.replace(/\.[^/.]+$/, ''),
      });
    }
  };

  const uploadDocument = async () => {
    if (!uploadForm.file) {
      toast.error('Выберите файл для загрузки');
      return;
    }

    if (!uploadForm.title.trim()) {
      toast.error('Введите название документа');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate file upload with progress
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('category', uploadForm.category);
      if (uploadForm.isNewVersion && uploadForm.previousVersionId) {
        formData.append('previousVersionId', uploadForm.previousVersionId);
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        toast.success('Документ успешно загружен');
        setShowUploadDialog(false);
        setUploadForm({
          title: '',
          description: '',
          category: 'other',
          file: null,
          isNewVersion: false,
          previousVersionId: '',
        });
        await fetchDocuments();
      } else {
        toast.error('Не удалось загрузить документ');
      }
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast.error('Произошла ошибка при загрузке');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      // В реальном приложении здесь был бы запрос на сервер для получения защищенной ссылки
      const response = await fetch(doc.fileUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Документ загружен');
    } catch (error) {
      console.error('Failed to download document:', error);
      toast.error('Не удалось скачать документ');
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Документ удален');
        await fetchDocuments();
      } else {
        toast.error('Не удалось удалить документ');
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Произошла ошибка при удалении');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    return fileTypeIcons[fileType] || File;
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Документы
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Централизованное хранилище документов компании
              </p>
            </div>
            
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Upload className="h-5 w-5" />
                  Загрузить документ
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Загрузка документа</DialogTitle>
                  <DialogDescription>
                    Загрузите новый документ или обновите версию существующего
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* File Input */}
                  <div className="space-y-2">
                    <Label>Файл</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        {uploadForm.file ? (
                          <span className="truncate">{uploadForm.file.name}</span>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Выбрать файл
                          </>
                        )}
                      </Button>
                    </div>
                    {uploadForm.file && (
                      <p className="text-sm text-gray-500">
                        Размер: {formatFileSize(uploadForm.file.size)}
                      </p>
                    )}
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="doc-title">Название</Label>
                    <Input
                      id="doc-title"
                      placeholder="Введите название документа"
                      value={uploadForm.title}
                      onChange={(e) =>
                        setUploadForm({ ...uploadForm, title: e.target.value })
                      }
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="doc-description">Описание (необязательно)</Label>
                    <Textarea
                      id="doc-description"
                      placeholder="Краткое описание документа..."
                      value={uploadForm.description}
                      onChange={(e) =>
                        setUploadForm({ ...uploadForm, description: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label>Категория</Label>
                    <Select
                      value={uploadForm.category}
                      onValueChange={(value) =>
                        setUploadForm({ ...uploadForm, category: value })
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

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Загрузка...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadDialog(false)}
                    disabled={isUploading}
                  >
                    Отмена
                  </Button>
                  <Button onClick={uploadDocument} disabled={isUploading || !uploadForm.file}>
                    {isUploading ? 'Загрузка...' : 'Загрузить'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Всего документов</p>
                  <p className="text-2xl font-semibold">{documents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Общий размер</p>
                  <p className="text-2xl font-semibold">
                    {formatFileSize(
                      documents.reduce((sum, doc) => sum + doc.fileSize, 0)
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Версий документов</p>
                  <p className="text-2xl font-semibold">
                    {documents.filter(doc => doc.version > 1).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Загружено сегодня</p>
                  <p className="text-2xl font-semibold">
                    {
                      documents.filter(
                        doc =>
                          new Date(doc.createdAt).toDateString() ===
                          new Date().toDateString()
                      ).length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Поиск документов..."
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
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">По дате</SelectItem>
                <SelectItem value="name">По названию</SelectItem>
                <SelectItem value="size">По размеру</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Documents Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка документов...</p>
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Документов не найдено
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Попробуйте изменить параметры поиска'
                  : 'Загрузите первый документ'}
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Размер</TableHead>
                  <TableHead>Версия</TableHead>
                  <TableHead>Загрузил</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const FileIcon = getFileIcon(doc.fileType);
                  const category = categories.find(c => c.value === doc.category);
                  
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <FileIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            {doc.description && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{category?.label}</Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <span>v{doc.version}</span>
                          {doc.previousVersion && (
                            <RefreshCw className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={doc.uploader.profileImage || undefined} />
                            <AvatarFallback>{doc.uploader.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{doc.uploader.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(doc.createdAt), 'd MMM yyyy', { locale: ru })}</p>
                          <p className="text-gray-500">
                            {format(new Date(doc.createdAt), 'HH:mm')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => downloadDocument(doc)}>
                              <Download className="h-4 w-4 mr-2" />
                              Скачать
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Просмотреть
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="h-4 w-4 mr-2" />
                              Поделиться
                            </DropdownMenuItem>
                            {doc.previousVersion && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDocument(doc);
                                  setShowVersionHistory(true);
                                }}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                История версий
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {(user?.role === 'ADMIN' || doc.uploader.id === user?.id) && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => deleteDocument(doc.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}