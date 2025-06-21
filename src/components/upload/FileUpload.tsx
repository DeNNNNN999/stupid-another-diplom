'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  File,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onUploadComplete?: (document: any) => void;
  acceptedFileTypes?: string;
  maxFileSize?: number;
  category?: string;
}

const fileIcons: Record<string, any> = {
  'application/pdf': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'application/vnd.ms-excel': FileSpreadsheet,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
  'image/png': FileImage,
  'image/jpeg': FileImage,
  'image/jpg': FileImage,
  'image/gif': FileImage,
  'application/zip': FileArchive,
  'application/x-rar-compressed': FileArchive,
};

export function FileUpload({
  onUploadComplete,
  acceptedFileTypes = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.zip,.rar',
  maxFileSize = 10 * 1024 * 1024, // 10MB
  category = 'general',
}: FileUploadProps) {
  const { token } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'pending' | 'uploading' | 'success' | 'error'>>({});
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate file size
    const validFiles = selectedFiles.filter(file => {
      if (file.size > maxFileSize) {
        toast.error(`${file.name} превышает максимальный размер ${maxFileSize / 1024 / 1024}MB`);
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    const fileName = files[index].name;
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
    setUploadStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[fileName];
      return newStatus;
    });
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', selectedCategory);
    formData.append('description', description);

    setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[file.name] || 0;
          if (currentProgress >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [file.name]: currentProgress + 10 };
        });
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      setUploadStatus(prev => ({ ...prev, [file.name]: 'success' }));
      
      onUploadComplete?.(data.document);
      
      return data.document;
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
      throw error;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    
    try {
      const uploadPromises = files.map(file => uploadFile(file));
      await Promise.all(uploadPromises);
      
      toast.success('Все файлы успешно загружены');
      
      // Clear successful uploads
      setTimeout(() => {
        setFiles([]);
        setUploadProgress({});
        setUploadStatus({});
        setDescription('');
      }, 2000);
    } catch (error) {
      toast.error('Ошибка при загрузке некоторых файлов');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    const Icon = fileIcons[file.type] || File;
    return Icon;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              'hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800',
              files.length > 0 && 'border-primary bg-gray-50 dark:bg-gray-800'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={acceptedFileTypes}
              multiple
              onChange={handleFileSelect}
            />
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Нажмите для выбора файлов
            </p>
            <p className="text-sm text-gray-500 mt-2">
              или перетащите файлы сюда
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Максимальный размер: {maxFileSize / 1024 / 1024}MB
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Категория</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Общие документы</SelectItem>
                    <SelectItem value="reports">Отчеты</SelectItem>
                    <SelectItem value="contracts">Договоры</SelectItem>
                    <SelectItem value="instructions">Инструкции</SelectItem>
                    <SelectItem value="forms">Формы и бланки</SelectItem>
                    <SelectItem value="presentations">Презентации</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Описание (необязательно)</Label>
                <Textarea
                  placeholder="Добавьте описание для документов..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                {files.map((file, index) => {
                  const Icon = getFileIcon(file);
                  const status = uploadStatus[file.name] || 'pending';
                  const progress = uploadProgress[file.name] || 0;

                  return (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <Icon className="h-8 w-8 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                        {status === 'uploading' && (
                          <Progress value={progress} className="h-1 mt-2" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {status === 'success' && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        {status === 'error' && (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        {status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="w-full"
              >
                {uploading ? 'Загрузка...' : `Загрузить ${files.length} файл(ов)`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
