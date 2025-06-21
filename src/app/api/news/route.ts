import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { JwtPayload } from '@/lib/auth';

// Get all news items with pagination and filtering
export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '0');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
    const category = request.nextUrl.searchParams.get('category');
    const importance = request.nextUrl.searchParams.get('importance');

    // Build where clause based on filters
    const whereClause: any = {};
    
    if (category) {
      whereClause.category = category;
    }
    
    if (importance) {
      whereClause.importance = importance;
    }

    // Get news items with pagination
    const newsItems = await prisma.news.findMany({
      where: whereClause,
      orderBy: [
        // First sort by importance (HIGH, NORMAL, LOW)
        { importance: 'asc' },
        // Then by publish date (newest first)
        { publishedAt: 'desc' }
      ],
      skip: page * limit,
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    // Get total count for pagination
    const total = await prisma.news.count({ where: whereClause });

    return NextResponse.json({
      items: newsItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error getting news:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve news' },
      { status: 500 }
    );
  }
});

// Create a new news item
export const POST = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const { title, content, category, importance } = await request.json();

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: 'Title, content, and category are required' },
        { status: 400 }
      );
    }

    const newsItem = await prisma.news.create({
      data: {
        title,
        content,
        category,
        importance: importance || 'NORMAL',
        author: {
          connect: { id: payload.userId },
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    // Create system-wide notification for high importance news
    if (importance === 'HIGH') {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      const notificationPromises = users.map(user =>
        prisma.notification.create({
          data: {
            title: 'Important News',
            content: `New important announcement: "${title}"`,
            type: 'NEWS',
            user: {
              connect: { id: user.id },
            },
          },
        })
      );

      await Promise.all(notificationPromises);
    }

    return NextResponse.json(newsItem, { status: 201 });
  } catch (error) {
    console.error('Error creating news item:', error);
    return NextResponse.json(
      { error: 'Failed to create news item' },
      { status: 500 }
    );
  }
});