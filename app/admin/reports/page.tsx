'use client';

import { useState } from 'react';
import DashboardLayout from '@/src/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { 
  Download,
  Calendar,
  TrendingUp,
  Users,
  MessageSquare,
  FileText,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// Mock data for charts
const userActivityData = [
  { date: '01.12', активность: 245, пользователи: 89 },
  { date: '02.12', активность: 398, пользователи: 95 },
  { date: '03.12', активность: 367, пользователи: 92 },
  { date: '04.12', активность: 412, пользователи: 98 },
  { date: '05.12', активность: 489, пользователи: 103 },
  { date: '06.12', активность: 356, пользователи: 87 },
  { date: '07.12', активность: 234, пользователи: 76 },
];

const contentDistribution = [
  { name: 'Сообщения', value: 4567, color: '#0088FE' },
  { name: 'Документы', value: 1234, color: '#00C49F' },
  { name: 'Конференции', value: 876, color: '#FFBB28' },
  { name: 'Новости', value: 234, color: '#FF8042' },
];

const departmentActivity = [
  { department: 'ИТ отдел', сообщения: 1234, документы: 345, конференции: 123 },
  { department: 'Юридический', сообщения: 987, документы: 456, конференции: 89 },
  { department: 'Финансовый', сообщения: 876, документы: 567, конференции: 98 },
  { department: 'HR', сообщения: 765, документы: 234, конференции: 76 },
  { department: 'Поддержка', сообщения: 654, документы: 123, конференции: 54 },
];

const monthlyGrowth = [
  { month: 'Янв', пользователи: 120, активность: 3400 },
  { month: 'Фев', пользователи: 132, активность: 3900 },
  { month: 'Мар', пользователи: 145, активность: 4200 },
  { month: 'Апр', пользователи: 156, активность: 4800 },
  { month: 'Май', пользователи: 168, активность: 5200 },
  { month: 'Июн', пользователи: 178, активность: 5600 },
];

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedReport, setSelectedReport] = useState('activity');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const handleExportReport = async () => {
    try {
      const response = await fetch('/api/admin/reports/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: selectedReport,
          period: selectedPeriod,
          startDate,
          endDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${selectedReport}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Отчет успешно экспортирован');
    } catch (error) {
      toast.error('Не удалось экспортировать отчет');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Отчеты и аналитика</h1>
            <p className="text-muted-foreground mt-2">
              Анализ активности и статистика системы
            </p>
          </div>
          <Button onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" />
            Экспорт отчета
          </Button>
        </div>

        {/* Report Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Параметры отчета</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Тип отчета</Label>
                <Select value={selectedReport} onValueChange={setSelectedReport}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activity">Активность пользователей</SelectItem>
                    <SelectItem value="content">Контент и документы</SelectItem>
                    <SelectItem value="departments">По отделам</SelectItem>
                    <SelectItem value="growth">Рост и тенденции</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Период</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">День</SelectItem>
                    <SelectItem value="week">Неделя</SelectItem>
                    <SelectItem value="month">Месяц</SelectItem>
                    <SelectItem value="quarter">Квартал</SelectItem>
                    <SelectItem value="year">Год</SelectItem>
                    <SelectItem value="custom">Произвольный</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedPeriod === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label>Начало периода</Label>
                    <DatePicker
                      date={startDate}
                      onDateChange={setStartDate}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Конец периода</Label>
                    <DatePicker
                      date={endDate}
                      onDateChange={setEndDate}
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        <Tabs value={selectedReport} onValueChange={setSelectedReport}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="activity">Активность</TabsTrigger>
            <TabsTrigger value="content">Контент</TabsTrigger>
            <TabsTrigger value="departments">Отделы</TabsTrigger>
            <TabsTrigger value="growth">Рост</TabsTrigger>
          </TabsList>

          {/* User Activity Report */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Активность пользователей по дням</CardTitle>
                  <CardDescription>
                    Количество активных действий и уникальных пользователей
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={userActivityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="активность" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="пользователи" 
                          stroke="#82ca9d" 
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Пиковые часы активности</CardTitle>
                  <CardDescription>
                    Распределение активности по времени суток
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { time: '09:00-12:00', percent: 85, count: 342 },
                      { time: '12:00-15:00', percent: 65, count: 261 },
                      { time: '15:00-18:00', percent: 78, count: 313 },
                      { time: '18:00-21:00', percent: 25, count: 100 },
                    ].map((item) => (
                      <div key={item.time} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{item.time}</span>
                          <span className="text-muted-foreground">{item.count} действий</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Статистика активности</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Всего действий</p>
                    <p className="text-2xl font-bold">12,543</p>
                    <p className="text-xs text-green-600">+12.5% за период</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Активных пользователей</p>
                    <p className="text-2xl font-bold">156</p>
                    <p className="text-xs text-green-600">+8.3% за период</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Среднее время сессии</p>
                    <p className="text-2xl font-bold">24 мин</p>
                    <p className="text-xs text-red-600">-5.2% за период</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Действий на пользователя</p>
                    <p className="text-2xl font-bold">80.4</p>
                    <p className="text-xs text-green-600">+3.8% за период</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Report */}
          <TabsContent value="content" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Распределение контента</CardTitle>
                  <CardDescription>
                    Типы контента в системе
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={contentDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {contentDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Топ категорий документов</CardTitle>
                  <CardDescription>
                    Наиболее популярные категории
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { category: 'Отчеты', count: 456, percent: 35 },
                      { category: 'Инструкции', count: 234, percent: 18 },
                      { category: 'Договоры', count: 189, percent: 15 },
                      { category: 'Презентации', count: 167, percent: 13 },
                      { category: 'Формы', count: 145, percent: 11 },
                      { category: 'Прочее', count: 103, percent: 8 },
                    ].map((item) => (
                      <div key={item.category} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item.category}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{item.count}</span>
                          <span className="text-xs text-muted-foreground">({item.percent}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Departments Report */}
          <TabsContent value="departments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Активность по отделам</CardTitle>
                <CardDescription>
                  Сравнение активности между отделами
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="сообщения" stackId="a" fill="#8884d8" />
                      <Bar dataKey="документы" stackId="a" fill="#82ca9d" />
                      <Bar dataKey="конференции" stackId="a" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Самый активный отдел
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">ИТ отдел</div>
                  <p className="text-xs text-muted-foreground">
                    1,702 действия за период
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Больше всего документов
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Финансовый</div>
                  <p className="text-xs text-muted-foreground">
                    567 документов загружено
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Больше всего конференций
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">HR</div>
                  <p className="text-xs text-muted-foreground">
                    123 конференции проведено
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Growth Report */}
          <TabsContent value="growth" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Рост показателей</CardTitle>
                <CardDescription>
                  Динамика роста пользователей и активности
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyGrowth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="пользователи"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="активность"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Прогноз на следующий квартал</CardTitle>
                <CardDescription>
                  На основе текущих трендов
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <h4 className="font-medium">Положительные тенденции</h4>
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Рост активных пользователей на 15% в месяц</li>
                      <li>• Увеличение загрузки документов на 22%</li>
                      <li>• Рост использования видеоконференций на 35%</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <h4 className="font-medium">Требуют внимания</h4>
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Снижение среднего времени сессии на 5%</li>
                      <li>• Низкая активность в выходные дни</li>
                      <li>• Необходимо больше обучающих материалов</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
