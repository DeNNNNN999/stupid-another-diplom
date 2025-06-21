import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { JwtPayload } from '@/lib/auth';

export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const query = request.nextUrl.searchParams.get('q') || '';
    const type = request.nextUrl.searchParams.get('type') || 'all';
    
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const results: any = { total: 0 };
    
    // Search users
    if (type === 'all' || type === 'users') {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { department: { contains: query, mode: 'insensitive' } },
            { position: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          position: true,
          profileImage: true,
        },
        take: 10,
      });
      
      results.users = users;
      results.total += users.length;
    }
    
    // Search news
    if (type === 'all' || type === 'news') {
      const news = await prisma.news.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
            { category: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 10,
      });
      
      results.news = news;
      results.total += news.length;
    }
    
    // Search documents
    if (type === 'all' || type === 'documents') {
      const documents = await prisma.document.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { filename: { contains: query, mode: 'insensitive' } },
            { category: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 10,
      });
      
      results.documents = documents;
      results.total += documents.length;
    }
    
    // Search conferences
    if (type === 'all' || type === 'conferences') {
      const conferences = await prisma.conference.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            where: {
              isHost: true,
            },
            take: 1,
          },
        },
        take: 10,
      });
      
      results.conferences = conferences;
      results.total += conferences.length;
    }
    
    return NextResponse.json({
      query,
      type,
      ...results,
    });
  } catch (error) {
    console.error('Error performing search:', error);
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    );
  }
});