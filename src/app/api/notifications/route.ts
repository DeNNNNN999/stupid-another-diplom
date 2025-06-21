import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { JwtPayload } from '@/lib/auth';

// Get notifications for the current user
export const GET = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '0');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true';

    // Build where clause
    const whereClause: any = {
      userId: payload.userId,
    };
    
    if (unreadOnly) {
      whereClause.isRead = false;
    }

    // Get notifications with pagination
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      skip: page * limit,
      take: limit,
    });

    // Get total count for pagination
    const total = await prisma.notification.count({ where: whereClause });
    
    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId: payload.userId,
        isRead: false,
      },
    });

    return NextResponse.json({
      notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve notifications' },
      { status: 500 }
    );
  }
});

// Mark all notifications as read
export const PUT = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: payload.userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
});