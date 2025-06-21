'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/src/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Search,
  Mail,
  Phone,
  Building,
  Briefcase,
  MapPin,
  MessageSquare,
  Video,
  UserCheck,
  Grid,
  List,
  Filter,
  ChevronRight,
  Star,
  Download,
  UserPlus,
  Clock,
  Globe,
  Shield,
  Calendar,
  Send,
  MoreHorizontal,
  SortAsc,
  SortDesc,
  X,
  Check,
  ChevronsUpDown,
  Heart,
  Eye,
  Settings,
  RefreshCw,
  Zap,
  Archive,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserStatus } from '@/components/ui/user-status';

interface Contact {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  department: string | null;
  position: string | null;
  phoneNumber: string | null;
  profileImage: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isOnline?: boolean;
  lastSeen?: string;
  isFavorite?: boolean;
}

interface Department {
  value: string;
  label: string;
  count: number;
}

interface ContactFilters {
  search: string;
  departments: string[];
  roles: string[];
  status: 'all' | 'online' | 'offline';
  favorites: boolean;
}

const defaultFilters: ContactFilters = {
  search: '',
  departments: [],
  roles: [],
  status: 'all',
  favorites: false,
};

export default function ContactsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<ContactFilters>(defaultFilters);
  const [sortBy, setSortBy] = useState<'name' | 'department' | 'position' | 'lastSeen'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Refs for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);
  const [displayCount, setDisplayCount] = useState(50);

  // Memoized filtered and sorted contacts
  const filteredContacts = useMemo(() => {
    let filtered = [...contacts];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        contact =>
          contact.name.toLowerCase().includes(searchLower) ||
          contact.email.toLowerCase().includes(searchLower) ||
          contact.position?.toLowerCase().includes(searchLower) ||
          contact.department?.toLowerCase().includes(searchLower) ||
          contact.phoneNumber?.includes(filters.search)
      );
    }

    // Department filter
    if (filters.departments.length > 0) {
      filtered = filtered.filter(contact => 
        contact.department && filters.departments.includes(contact.department)
      );
    }

    // Role filter
    if (filters.roles.length > 0) {
      filtered = filtered.filter(contact => filters.roles.includes(contact.role));
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(contact => 
        filters.status === 'online' ? contact.isOnline : !contact.isOnline
      );
    }

    // Favorites filter
    if (filters.favorites) {
      filtered = filtered.filter(contact => favorites.has(contact.id));
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'department':
          aValue = a.department || '';
          bValue = b.department || '';
          break;
        case 'position':
          aValue = a.position || '';
          bValue = b.position || '';
          break;
        case 'lastSeen':
          aValue = new Date(a.lastSeen || a.updatedAt).getTime();
          bValue = new Date(b.lastSeen || b.updatedAt).getTime();
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return filtered;
  }, [contacts, filters, sortBy, sortOrder, favorites]);

  const displayedContacts = useMemo(() => 
    filteredContacts.slice(0, displayCount), 
    [filteredContacts, displayCount]
  );

  // Grouped contacts for grid view
  const groupedContacts = useMemo(() => {
    const groups: { [key: string]: Contact[] } = {};
    
    displayedContacts.forEach(contact => {
      let groupKey: string;
      
      if (sortBy === 'department') {
        groupKey = contact.department || 'Без отдела';
      } else {
        groupKey = contact.name.charAt(0).toUpperCase();
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(contact);
    });
    
    return groups;
  }, [displayedContacts, sortBy]);

  const stats = useMemo(() => {
    const online = contacts.filter(c => c.isOnline).length;
    const admins = contacts.filter(c => c.role === 'ADMIN').length;
    const depts = new Set(contacts.map(c => c.department).filter(Boolean)).size;
    
    return {
      total: contacts.length,
      filtered: filteredContacts.length,
      online,
      admins,
      departments: depts,
      favorites: favorites.size,
    };
  }, [contacts, filteredContacts.length, favorites.size]);

  // Load contacts
  const fetchContacts = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      
      const response = await fetch('/api/contacts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
        setDepartments(data.departments || []);
        
        // Load favorites from localStorage
        const savedFavorites = localStorage.getItem('contact-favorites');
        if (savedFavorites) {
          setFavorites(new Set(JSON.parse(savedFavorites)));
        }
      } else {
        throw new Error('Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      toast.error('Не удалось загрузить контакты');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Infinite scroll setup
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedContacts.length < filteredContacts.length) {
          setDisplayCount(prev => Math.min(prev + 50, filteredContacts.length));
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [displayedContacts.length, filteredContacts.length]);

  // Actions
  const toggleFavorite = useCallback((contactId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(contactId)) {
        newFavorites.delete(contactId);
        toast.success('Удалено из избранного');
      } else {
        newFavorites.add(contactId);
        toast.success('Добавлено в избранное');
      }
      
      // Save to localStorage
      localStorage.setItem('contact-favorites', JSON.stringify(Array.from(newFavorites)));
      return newFavorites;
    });
  }, []);

  const startChat = useCallback(async (contactId: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isGroup: false,
          userIds: [contactId],
        }),
      });

      if (response.ok) {
        router.push('/chat');
        toast.success('Чат создан');
      } else {
        throw new Error('Failed to create chat');
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
      toast.error('Не удалось начать чат');
    }
  }, [token, router]);

  const startVideoCall = useCallback(async (contactId: string) => {
    try {
      const response = await fetch('/api/conference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Экстренный звонок',
          participants: [contactId],
          startTime: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const { conferenceId } = await response.json();
        router.push(`/conference/${conferenceId}`);
        toast.success('Конференция создана');
      } else {
        throw new Error('Failed to create conference');
      }
    } catch (error) {
      console.error('Failed to start video call:', error);
      toast.info('Функция видеозвонка в разработке');
    }
  }, [token, router]);

  const exportContacts = useCallback(() => {
    const csvData = filteredContacts.map(contact => ({
      'Имя': contact.name,
      'Email': contact.email,
      'Отдел': contact.department || '',
      'Должность': contact.position || '',
      'Телефон': contact.phoneNumber || '',
      'Роль': contact.role === 'ADMIN' ? 'Администратор' : 'Сотрудник',
      'Статус': contact.isOnline ? 'Онлайн' : 'Офлайн',
    }));

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Контакты экспортированы');
  }, [filteredContacts]);

  const bulkStartChat = useCallback(async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isGroup: true,
          userIds: Array.from(selectedContacts),
          name: `Групповой чат (${selectedContacts.size} участников)`,
        }),
      });

      if (response.ok) {
        setSelectedContacts(new Set());
        router.push('/chat');
        toast.success('Групповой чат создан');
      } else {
        throw new Error('Failed to create group chat');
      }
    } catch (error) {
      console.error('Failed to create group chat:', error);
      toast.error('Не удалось создать групповой чат');
    }
  }, [selectedContacts, token, router]);

  const openContactDetails = useCallback((contact: Contact) => {
    setSelectedContact(contact);
    setShowContactDialog(true);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setSelectedContacts(new Set());
  }, []);

  const toggleSort = useCallback((field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="space-y-6">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Контакты
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Справочник сотрудников организации ({stats.filtered} из {stats.total})
            </p>
          </div>
          
          <div className="flex items-center space-x-2 mt-4 lg:mt-0">
            {selectedContacts.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={bulkStartChat}
                  disabled={selectedContacts.size < 2}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Групповой чат ({selectedContacts.size})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedContacts(new Set())}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportContacts}
              disabled={filteredContacts.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Экспорт
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchContacts(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Всего</p>
                  <p className="text-xl font-semibold">{stats.total}</p>
                </div>
                <Users className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Онлайн</p>
                  <p className="text-xl font-semibold text-green-600">{stats.online}</p>
                </div>
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Админы</p>
                  <p className="text-xl font-semibold">{stats.admins}</p>
                </div>
                <Shield className="h-5 w-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Отделы</p>
                  <p className="text-xl font-semibold">{stats.departments}</p>
                </div>
                <Building className="h-5 w-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Избранное</p>
                  <p className="text-xl font-semibold">{stats.favorites}</p>
                </div>
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Найдено</p>
                  <p className="text-xl font-semibold">{stats.filtered}</p>
                </div>
                <Search className="h-5 w-5 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <div className="space-y-4 mb-6">
          {/* Search and Quick Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Поиск сотрудников..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={filters.favorites ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, favorites: !prev.favorites }))}
              >
                <Star className="h-4 w-4 mr-2" />
                Избранное
              </Button>
              
              <Select 
                value={filters.status} 
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="online">Онлайн</SelectItem>
                  <SelectItem value="offline">Офлайн</SelectItem>
                </SelectContent>
              </Select>

              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Фильтры
                    {(filters.departments.length > 0 || filters.roles.length > 0) && (
                      <Badge variant="secondary" className="ml-2 px-1 py-0 text-xs">
                        {filters.departments.length + filters.roles.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Отделы</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {departments.map(dept => (
                          <div key={dept.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`dept-${dept.value}`}
                              checked={filters.departments.includes(dept.value)}
                              onCheckedChange={(checked) => {
                                setFilters(prev => ({
                                  ...prev,
                                  departments: checked
                                    ? [...prev.departments, dept.value]
                                    : prev.departments.filter(d => d !== dept.value)
                                }));
                              }}
                            />
                            <label 
                              htmlFor={`dept-${dept.value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                            >
                              {dept.label}
                              <span className="text-gray-500 ml-1">({dept.count})</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-medium mb-2">Роли</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="role-admin"
                            checked={filters.roles.includes('ADMIN')}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                roles: checked
                                  ? [...prev.roles, 'ADMIN']
                                  : prev.roles.filter(r => r !== 'ADMIN')
                              }));
                            }}
                          />
                          <label htmlFor="role-admin" className="text-sm font-medium">
                            Администраторы ({stats.admins})
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="role-employee"
                            checked={filters.roles.includes('EMPLOYEE')}
                            onCheckedChange={(checked) => {
                              setFilters(prev => ({
                                ...prev,
                                roles: checked
                                  ? [...prev.roles, 'EMPLOYEE']
                                  : prev.roles.filter(r => r !== 'EMPLOYEE')
                              }));
                            }}
                          />
                          <label htmlFor="role-employee" className="text-sm font-medium">
                            Сотрудники ({stats.total - stats.admins})
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        Сбросить
                      </Button>
                      <Button size="sm" onClick={() => setShowFilters(false)}>
                        Применить
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* View Controls and Sorting */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Вид:</span>
              <div className="flex gap-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Сортировка:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {sortBy === 'name' && 'По имени'}
                    {sortBy === 'department' && 'По отделу'}
                    {sortBy === 'position' && 'По должности'}
                    {sortBy === 'lastSeen' && 'По активности'}
                    {sortOrder === 'asc' ? (
                      <SortAsc className="h-4 w-4 ml-2" />
                    ) : (
                      <SortDesc className="h-4 w-4 ml-2" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => toggleSort('name')}>
                    По имени
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort('department')}>
                    По отделу
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort('position')}>
                    По должности
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort('lastSeen')}>
                    По активности
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Contacts */}
        {filteredContacts.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                Контакты не найдены
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Попробуйте изменить параметры поиска или фильтры
              </p>
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            </div>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="space-y-8">
            {Object.entries(groupedContacts).map(([groupKey, contactsInGroup]) => (
              <div key={groupKey}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  {sortBy === 'department' ? (
                    <Building className="h-5 w-5 mr-2" />
                  ) : (
                    <span className="w-5 h-5 mr-2 text-center text-sm font-bold">
                      {groupKey}
                    </span>
                  )}
                  {groupKey}
                  <Badge variant="secondary" className="ml-2">
                    {contactsInGroup.length}
                  </Badge>
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {contactsInGroup.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      isSelected={selectedContacts.has(contact.id)}
                      isFavorite={favorites.has(contact.id)}
                      onSelect={(selected) => {
                        setSelectedContacts(prev => {
                          const newSet = new Set(prev);
                          if (selected) {
                            newSet.add(contact.id);
                          } else {
                            newSet.delete(contact.id);
                          }
                          return newSet;
                        });
                      }}
                      onToggleFavorite={() => toggleFavorite(contact.id)}
                      onStartChat={() => startChat(contact.id)}
                      onStartVideoCall={() => startVideoCall(contact.id)}
                      onViewProfile={() => openContactDetails(contact)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <Card>
            <div className="divide-y">
              {displayedContacts.map((contact) => (
                <ContactListItem
                  key={contact.id}
                  contact={contact}
                  isSelected={selectedContacts.has(contact.id)}
                  isFavorite={favorites.has(contact.id)}
                  onSelect={(selected) => {
                    setSelectedContacts(prev => {
                      const newSet = new Set(prev);
                      if (selected) {
                        newSet.add(contact.id);
                      } else {
                        newSet.delete(contact.id);
                      }
                      return newSet;
                    });
                  }}
                  onToggleFavorite={() => toggleFavorite(contact.id)}
                  onStartChat={() => startChat(contact.id)}
                  onStartVideoCall={() => startVideoCall(contact.id)}
                  onViewProfile={() => openContactDetails(contact)}
                />
              ))}
            </div>
          </Card>
        ) : (
          <ContactTable
            contacts={displayedContacts}
            selectedContacts={selectedContacts}
            favorites={favorites}
            onSelectContact={(contactId, selected) => {
              setSelectedContacts(prev => {
                const newSet = new Set(prev);
                if (selected) {
                  newSet.add(contactId);
                } else {
                  newSet.delete(contactId);
                }
                return newSet;
              });
            }}
            onSelectAll={(selected) => {
              if (selected) {
                setSelectedContacts(new Set(displayedContacts.map(c => c.id)));
              } else {
                setSelectedContacts(new Set());
              }
            }}
            onToggleFavorite={toggleFavorite}
            onStartChat={startChat}
            onStartVideoCall={startVideoCall}
            onViewProfile={openContactDetails}
          />
        )}

        {/* Infinite scroll trigger */}
        {displayedContacts.length < filteredContacts.length && (
          <div ref={observerTarget} className="mt-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        )}

        {/* Contact Details Dialog */}
        <ContactDetailsDialog
          contact={selectedContact}
          open={showContactDialog}
          onOpenChange={setShowContactDialog}
          isFavorite={selectedContact ? favorites.has(selectedContact.id) : false}
          onToggleFavorite={() => selectedContact && toggleFavorite(selectedContact.id)}
          onStartChat={() => selectedContact && startChat(selectedContact.id)}
          onStartVideoCall={() => selectedContact && startVideoCall(selectedContact.id)}
        />
      </div>
    </DashboardLayout>
  );
}

// Contact Card Component
interface ContactCardProps {
  contact: Contact;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: (selected: boolean) => void;
  onToggleFavorite: () => void;
  onStartChat: () => void;
  onStartVideoCall: () => void;
  onViewProfile: () => void;
}

function ContactCard({
  contact,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onStartChat,
  onStartVideoCall,
  onViewProfile,
}: ContactCardProps) {
  return (
    <Card
      className={cn(
        "hover:shadow-lg transition-all duration-200 cursor-pointer group",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={onViewProfile}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Header with checkbox and favorite */}
          <div className="w-full flex justify-between items-start">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
                )}
              />
            </Button>
          </div>

          {/* Avatar and Status */}
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={contact.profileImage || undefined} />
              <AvatarFallback className="text-lg">
                {contact.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <UserStatus
              isOnline={contact.isOnline || false}
              className="absolute -bottom-1 -right-1"
            />
          </div>

          {/* Contact Info */}
          <div className="w-full">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
              {contact.name}
            </h4>
            {contact.position && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {contact.position}
              </p>
            )}
            <p className="text-xs text-gray-500 truncate mt-1">
              {contact.email}
            </p>
            
            <div className="flex flex-wrap gap-1 mt-2 justify-center">
              {contact.role === 'ADMIN' && (
                <Badge variant="destructive" className="text-xs">
                  Админ
                </Badge>
              )}
              {contact.department && (
                <Badge variant="secondary" className="text-xs">
                  {contact.department}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onStartChat();
              }}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `mailto:${contact.email}`;
              }}
            >
              <Mail className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onStartVideoCall();
              }}
            >
              <Video className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Contact List Item Component
interface ContactListItemProps extends ContactCardProps {}

function ContactListItem({
  contact,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onStartChat,
  onStartVideoCall,
  onViewProfile,
}: ContactListItemProps) {
  return (
    <div
      className={cn(
        "p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between group",
        isSelected && "bg-primary/10"
      )}
      onClick={onViewProfile}
    >
      <div className="flex items-center space-x-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />
        
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={contact.profileImage || undefined} />
            <AvatarFallback>
              {contact.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <UserStatus
            isOnline={contact.isOnline || false}
            className="absolute -bottom-1 -right-1"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
              {contact.name}
            </h4>
            {contact.role === 'ADMIN' && (
              <Badge variant="destructive" className="text-xs">
                Админ
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
            >
              <Star
                className={cn(
                  "h-3 w-3",
                  isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
                )}
              />
            </Button>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
            {contact.position && <span className="truncate">{contact.position}</span>}
            {contact.department && (
              <span className="truncate">{contact.department}</span>
            )}
            <span className="truncate">{contact.email}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onStartChat();
          }}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onStartVideoCall();
          }}
        >
          <Video className="h-4 w-4" />
        </Button>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  );
}

// Contact Table Component
interface ContactTableProps {
  contacts: Contact[];
  selectedContacts: Set<string>;
  favorites: Set<string>;
  onSelectContact: (contactId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onToggleFavorite: (contactId: string) => void;
  onStartChat: (contactId: string) => void;
  onStartVideoCall: (contactId: string) => void;
  onViewProfile: (contact: Contact) => void;
}

function ContactTable({
  contacts,
  selectedContacts,
  favorites,
  onSelectContact,
  onSelectAll,
  onToggleFavorite,
  onStartChat,
  onStartVideoCall,
  onViewProfile,
}: ContactTableProps) {
  const allSelected = contacts.length > 0 && contacts.every(c => selectedContacts.has(c.id));
  const someSelected = contacts.some(c => selectedContacts.has(c.id));

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onCheckedChange={onSelectAll}
                />
              </th>
              <th className="text-left p-4">Сотрудник</th>
              <th className="text-left p-4">Должность</th>
              <th className="text-left p-4">Отдел</th>
              <th className="text-left p-4">Контакты</th>
              <th className="text-left p-4">Статус</th>
              <th className="text-left p-4">Действия</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr 
                key={contact.id} 
                className={cn(
                  "border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer",
                  selectedContacts.has(contact.id) && "bg-primary/10"
                )}
                onClick={() => onViewProfile(contact)}
              >
                <td className="p-4">
                  <Checkbox
                    checked={selectedContacts.has(contact.id)}
                    onCheckedChange={(checked) => onSelectContact(contact.id, !!checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={contact.profileImage || undefined} />
                        <AvatarFallback>
                          {contact.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <UserStatus
                        isOnline={contact.isOnline || false}
                        className="absolute -bottom-1 -right-1"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{contact.name}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(contact.id);
                          }}
                        >
                          <Star
                            className={cn(
                              "h-3 w-3",
                              favorites.has(contact.id) 
                                ? "fill-yellow-400 text-yellow-400" 
                                : "text-gray-400"
                            )}
                          />
                        </Button>
                      </div>
                      {contact.role === 'ADMIN' && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          Администратор
                        </Badge>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <p className="text-sm">{contact.position || '—'}</p>
                </td>
                <td className="p-4">
                  <p className="text-sm">{contact.department || '—'}</p>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <p className="text-sm">{contact.email}</p>
                    {contact.phoneNumber && (
                      <p className="text-xs text-gray-500">{contact.phoneNumber}</p>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <UserStatus isOnline={contact.isOnline || false} showText />
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartChat(contact.id);
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartVideoCall(contact.id);
                      }}
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `mailto:${contact.email}`;
                      }}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Contact Details Dialog Component
interface ContactDetailsDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onStartChat: () => void;
  onStartVideoCall: () => void;
}

function ContactDetailsDialog({
  contact,
  open,
  onOpenChange,
  isFavorite,
  onToggleFavorite,
  onStartChat,
  onStartVideoCall,
}: ContactDetailsDialogProps) {
  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Профиль сотрудника
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFavorite}
            >
              <Star
                className={cn(
                  "h-5 w-5",
                  isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
                )}
              />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={contact.profileImage || undefined} />
                <AvatarFallback className="text-2xl">
                  {contact.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <UserStatus
                isOnline={contact.isOnline || false}
                className="absolute bottom-4 -right-1"
              />
            </div>
            
            <h3 className="text-xl font-semibold">{contact.name}</h3>
            {contact.position && (
              <p className="text-gray-600 dark:text-gray-400">
                {contact.position}
              </p>
            )}
            
            <div className="flex items-center space-x-2 mt-2">
              {contact.role === 'ADMIN' && (
                <Badge variant="destructive">Администратор</Badge>
              )}
              <UserStatus isOnline={contact.isOnline || false} showText />
            </div>
          </div>

          <Separator />

          {/* Contact Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Email</p>
                <a
                  href={`mailto:${contact.email}`}
                  className="text-primary hover:underline"
                >
                  {contact.email}
                </a>
              </div>
            </div>

            {contact.phoneNumber && (
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Телефон</p>
                  <a
                    href={`tel:${contact.phoneNumber}`}
                    className="text-primary hover:underline"
                  >
                    {contact.phoneNumber}
                  </a>
                </div>
              </div>
            )}

            {contact.department && (
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Отдел</p>
                  <p>{contact.department}</p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">В системе с</p>
                <p>{new Date(contact.createdAt).toLocaleDateString('ru-RU')}</p>
              </div>
            </div>

            {contact.lastSeen && (
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Последняя активность</p>
                  <p>{new Date(contact.lastSeen).toLocaleString('ru-RU')}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => {
                onStartChat();
                onOpenChange(false);
              }}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Написать сообщение
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onStartVideoCall();
                  onOpenChange(false);
                }}
              >
                <Video className="h-4 w-4 mr-2" />
                Звонок
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = `mailto:${contact.email}`;
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}