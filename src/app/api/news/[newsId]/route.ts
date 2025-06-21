import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { JwtPayload } from '@/lib/auth';

// Get a specific news item with its comments
export const GET = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { newsId: string } }
) => {
  try {
    const { newsId } = params;

    const newsItem = await prisma.news.findUnique({
      where: { id: newsId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        comments: {
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
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!newsItem) {
      return NextResponse.json(
        { error: 'News item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(newsItem);
  } catch (error) {
    console.error('Error getting news item:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve news item' },
      { status: 500 }
    );
  }
});

// Update a news item
export const PATCH = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { newsId: string } }
) => {
  try {
    const { newsId } = params;
    const { title, content, category, importance } = await request.json();

    // Get the current news item
    const newsItem = await prisma.news.findUnique({
      where: { id: newsId },
    });

    if (!newsItem) {
      return NextResponse.json(
        { error: 'News item not found' },
        { status: 404 }
      );
    }

    // Check permissions (author or admin)
    if (newsItem.authorId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You do not have permission to update this news item' },
        { status: 403 }
      );
    }

    // Update the news item
    const updatedNewsItem = await prisma.news.update({
      where: { id: newsId },
      data: {
        title,
        content,
        category,
        importance,
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

    return NextResponse.json(updatedNewsItem);
  } catch (error) {
    console.error('Error updating news item:', error);
    return NextResponse.json(
      { error: 'Failed to update news item' },
      { status: 500 }
    );
  }
});

// Delete a news item
export const DELETE = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { newsId: string } }
) => {
  try {
    const { newsId } = params;

    // Get the current news item
    const newsItem = await prisma.news.findUnique({
      where: { id: newsId },
    });

    if (!newsItem) {
      return NextResponse.json(
        { error: 'News item not found' },
        { status: 404 }
      );
    }

    // Check permissions (author or admin)
    if (newsItem.authorId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You do not have permission to delete this news item' },
        { status: 403 }
      );
    }

    // Delete all comments first
    await prisma.comment.deleteMany({
      where: { newsId },
    });

    // Delete the news item
    await prisma.news.delete({
      where: { id: newsId },
    });

    return NextResponse.json({ message: 'News item deleted successfully' });
  } catch (error) {
    console.error('Error deleting news item:', error);
    return NextResponse.json(
      { error: 'Failed to delete news item' },
      { status: 500 }
    );
  }
});