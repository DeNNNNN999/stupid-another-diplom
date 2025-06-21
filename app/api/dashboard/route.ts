import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import type { JwtPayload } from '@/src/lib/auth';

export const GET = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const userId = payload.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get unread messages count
    const unreadMessagesCount = await prisma.message.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });
    
    // Get active conferences count (that user is part of)
    const activeConferencesCount = await prisma.conference.count({
      where: {
        isActive: true,
        participants: {
          some: {
            userId: userId,
          },
        },
      },
    });
    
    // Get today's documents count
    const todayDocumentsCount = await prisma.document.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    });
    
    // Get online users count (from connected users - this would come from Socket.io in real app)
    // For now, we'll count users who were active in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineUsersCount = await prisma.user.count({
      where: {
        isActive: true,
        updatedAt: {
          gte: fiveMinutesAgo,
        },
      },
    });
    
    // Get user's recent activities
    const recentActivities = [];
    
    // Recent messages sent by user
    const recentMessages = await prisma.message.findMany({
      where: {
        senderId: userId,
      },
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        recipient: {
          select: {
            name: true,
          },
        },
        chatRoom: {
          select: {
            name: true,
          },
        },
      },
    });
    
    recentMessages.forEach(msg => {
      recentActivities.push({
        id: msg.id,
        type: 'message',
        action: msg.recipient 
          ? `Вы отправили сообщение ${msg.recipient.name}`
          : `Вы отправили сообщение в чат "${msg.chatRoom?.name || 'Групповой чат'}"`,
        time: msg.createdAt,
        icon: 'MessageSquare',
      });
    });
    
    // Recent documents uploaded by user
    const recentDocuments = await prisma.document.findMany({
      where: {
        uploaderId: userId,
      },
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    recentDocuments.forEach(doc => {
      recentActivities.push({
        id: doc.id,
        type: 'document',
        action: `Вы загрузили документ "${doc.title}"`,
        time: doc.createdAt,
        icon: 'FileText',
      });
    });
    
    // Recent conferences user participated in
    const recentConferences = await prisma.conferenceUser.findMany({
      where: {
        userId: userId,
        conference: {
          endTime: {
            not: null,
          },
        },
      },
      take: 5,
      orderBy: {
        joinedAt: 'desc',
      },
      include: {
        conference: {
          select: {
            title: true,
            endTime: true,
          },
        },
      },
    });
    
    recentConferences.forEach(conf => {
      if (conf.conference.endTime) {
        recentActivities.push({
          id: conf.conferenceId,
          type: 'conference',
          action: `Вы участвовали в конференции "${conf.conference.title}"`,
          time: conf.conference.endTime,
          icon: 'Video',
        });
      }
    });
    
    // Sort activities by time
    recentActivities.sort((a, b) => b.time.getTime() - a.time.getTime());
    const topRecentActivities = recentActivities.slice(0, 10);
    
    // Get upcoming conferences for today
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    const upcomingConferences = await prisma.conference.findMany({
      where: {
        startTime: {
          gte: new Date(), // From now
          lte: endOfDay,  // Until end of day
        },
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 5,
    });
    
    // Get unread notifications count
    const unreadNotificationsCount = await prisma.notification.count({
      where: {
        userId: userId,
        isRead: false,
      },
    });
    
    // Calculate trends (comparing with last week)
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    const lastWeekMessages = await prisma.message.count({
      where: {
        recipientId: userId,
        createdAt: {
          gte: lastWeek,
          lt: today,
        },
      },
    });
    
    const thisWeekMessages = await prisma.message.count({
      where: {
        recipientId: userId,
        createdAt: {
          gte: today,
        },
      },
    });
    
    const messagesTrend = lastWeekMessages > 0 
      ? ((thisWeekMessages - lastWeekMessages) / lastWeekMessages * 100).toFixed(1)
      : '0';
    
    return NextResponse.json({
      stats: [
        { 
          name: 'Новых сообщений', 
          value: unreadMessagesCount.toString(), 
          icon: 'MessageSquare', 
          change: `${messagesTrend > '0' ? '+' : ''}${messagesTrend}%` 
        },
        { 
          name: 'Активных конференций', 
          value: activeConferencesCount.toString(), 
          icon: 'Video', 
          change: '+12%' // This would need historical data to calculate properly
        },
        { 
          name: 'Документов сегодня', 
          value: todayDocumentsCount.toString(), 
          icon: 'FileText', 
          change: '+8.2%' // This would need historical data to calculate properly
        },
        { 
          name: 'Онлайн сотрудников', 
          value: onlineUsersCount.toString(), 
          icon: 'Users', 
          change: '+2.1%' // This would need Socket.io integration
        },
      ],
      recentActivities: topRecentActivities,
      upcomingEvents: upcomingConferences.map(conf => ({
        id: conf.id,
        time: conf.startTime.toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        title: conf.title,
        type: 'Конференция',
        duration: conf.endTime 
          ? `${Math.round((conf.endTime.getTime() - conf.startTime.getTime()) / 1000 / 60)} мин`
          : '',
      })),
      unreadNotifications: unreadNotificationsCount,
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve dashboard data' },
      { status: 500 }
    );
  }
});
