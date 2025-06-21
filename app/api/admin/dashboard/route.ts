import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import type { JwtPayload } from '@/src/lib/auth';

export const GET = requireAdmin(async (request: NextRequest, payload: JwtPayload) => {
  try {
    // Get active users count
    const userCount = await prisma.user.count({
      where: { isActive: true },
    });
    
    // Get admin users count
    const adminCount = await prisma.user.count({
      where: { 
        isActive: true,
        role: 'ADMIN'
      },
    });
    
    // Get total messages count
    const messageCount = await prisma.message.count();
    
    // Get active conferences count
    const activeConferenceCount = await prisma.conference.count({
      where: { isActive: true },
    });
    
    // Get documents count
    const documentCount = await prisma.document.count();
    
    // Get news count
    const newsCount = await prisma.news.count();
    
    // Get active users (for the active users list)
    const activeUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profileImage: true,
        department: true,
        position: true,
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Get recent activities (sample from different entities)
    const recentMessages = await prisma.message.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    const recentConferences = await prisma.conference.findMany({
      take: 5,
      orderBy: {
        startTime: 'desc',
      },
      include: {
        participants: {
          where: {
            isHost: true,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          take: 1,
        },
      },
    });
    
    const recentDocuments = await prisma.document.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    const recentNews = await prisma.news.findMany({
      take: 5,
      orderBy: {
        publishedAt: 'desc',
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // Combine recent activities
    const recentActivities = [
      ...recentMessages.map(m => ({
        type: 'message',
        id: m.id,
        title: `New message from ${m.sender.name}`,
        timestamp: m.createdAt,
        entity: m,
      })),
      ...recentConferences.map(c => ({
        type: 'conference',
        id: c.id,
        title: `Conference created: ${c.title}`,
        timestamp: c.startTime,
        entity: c,
      })),
      ...recentDocuments.map(d => ({
        type: 'document',
        id: d.id,
        title: `Document uploaded: ${d.title}`,
        timestamp: d.createdAt,
        entity: d,
      })),
      ...recentNews.map(n => ({
        type: 'news',
        id: n.id,
        title: `News published: ${n.title}`,
        timestamp: n.publishedAt,
        entity: n,
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
    
    // Get user registration trend (last 7 days)
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    
    const usersByDay = await prisma.$queryRaw`
      SELECT DATE(u."createdAt") as date, COUNT(*) as count
      FROM "User" u
      WHERE u."createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE(u."createdAt")
      ORDER BY date ASC
    `;
    
    // Fill in days with no registrations
    const userTrend = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const found = (usersByDay as any[]).find(d => {
        const rowDate = new Date(d.date).toISOString().split('T')[0];
        return rowDate === dateStr;
      });
      
      userTrend.push({
        date: dateStr,
        count: found ? Number(found.count) : 0,
      });
    }
    
    return NextResponse.json({
      stats: {
        userCount,
        adminCount,
        messageCount,
        activeConferenceCount,
        documentCount,
        newsCount,
      },
      activeUsers,
      recentActivities,
      userTrend,
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve dashboard data' },
      { status: 500 }
    );
  }
});
