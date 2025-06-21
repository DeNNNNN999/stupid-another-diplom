import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

// Get all users as contacts with enhanced data
export const GET = requireAuth(async (request: NextRequest) => {
  try {
    // Get all active users
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        position: true,
        phoneNumber: true,
        profileImage: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform users to contacts with online status simulation
    // В реальном приложении это бы бралось из Socket.io connected users или Redis
    const contacts = users.map(user => ({
      ...user,
      // Simulate online status - last activity within 5 minutes = online
      isOnline: Math.random() > 0.6, // Симуляция: 40% онлайн
      lastSeen: new Date(
        Date.now() - Math.random() * 24 * 60 * 60 * 1000 // Случайное время в последние 24 часа
      ).toISOString(),
      isFavorite: false, // Будет управляться через localStorage на клиенте
    }));

    // Get department statistics
    const departmentStats = await prisma.user.groupBy({
      by: ['department'],
      where: {
        isActive: true,
        department: {
          not: null,
        },
      },
      _count: {
        department: true,
      },
    });

    // Transform department stats to the format needed by frontend
    const departments = [
      { value: 'all', label: 'Все отделы', count: users.length },
      ...departmentStats.map(stat => ({
        value: stat.department || 'unknown',
        label: getDepartmentLabel(stat.department || ''),
        count: stat._count.department,
      })),
    ];

    // Add "No Department" if there are users without department
    const usersWithoutDept = users.filter(u => !u.department).length;
    if (usersWithoutDept > 0) {
      departments.push({
        value: 'none',
        label: 'Без отдела',
        count: usersWithoutDept,
      });
    }

    return NextResponse.json({
      contacts,
      departments,
      stats: {
        total: users.length,
        online: contacts.filter(c => c.isOnline).length,
        admins: users.filter(u => u.role === 'ADMIN').length,
        departments: departmentStats.length + (usersWithoutDept > 0 ? 1 : 0),
      },
    });
  } catch (error) {
    console.error('Error getting contacts:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve contacts' },
      { status: 500 }
    );
  }
});

// Helper function to get department display labels
function getDepartmentLabel(department: string): string {
  const departmentMap: { [key: string]: string } = {
    'IT отдел': 'ИТ отдел',
    'Отдел камеральных проверок': 'Камеральные проверки',
    'Отдел выездных проверок': 'Выездные проверки',
    'Юридический отдел': 'Юридический отдел',
    'Отдел регистрации и учета': 'Регистрация и учет',
    'Финансовый отдел': 'Финансовый отдел',
    'Отдел кадров': 'Отдел кадров',
    'Аналитический отдел': 'Аналитический отдел',
    'Отдел поддержки': 'Отдел поддержки',
    'management': 'Руководство',
    'it': 'ИТ отдел',
    'hr': 'Отдел кадров',
    'finance': 'Финансовый отдел',
    'legal': 'Юридический отдел',
    'analytics': 'Аналитический отдел',
    'support': 'Отдел поддержки',
  };

  return departmentMap[department] || department;
}

// Get online users (for real-time status)
export async function POST(request: NextRequest) {
  try {
    // This would typically connect to Socket.io or Redis to get real online users
    // For now, we'll simulate it based on recent activity
    
    const { userIds } = await request.json();
    
    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'userIds array required' }, { status: 400 });
    }

    // В реальном приложении здесь был бы запрос к Socket.io connected users
    // или Redis для получения актуального статуса онлайн
    const onlineUsers = userIds.filter(() => Math.random() > 0.5); // Симуляция

    return NextResponse.json({
      onlineUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting online status:', error);
    return NextResponse.json(
      { error: 'Failed to get online status' },
      { status: 500 }
    );
  }
}