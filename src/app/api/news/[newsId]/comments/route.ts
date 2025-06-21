import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { JwtPayload } from '@/lib/auth';

// Get comments for a specific news item
export const GET = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { newsId: string } }
) => {
  try {
    const { newsId } = params;

    const comments = await prisma.comment.findMany({
      where: { newsId },
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
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error getting comments:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve comments' },
      { status: 500 }
    );
  }
});

// Add a comment to a news item
export const POST = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { newsId: string } }
) => {
  try {
    const { newsId } = params;
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Check if the news item exists
    const newsItem = await prisma.news.findUnique({
      where: { id: newsId },
    });

    if (!newsItem) {
      return NextResponse.json(
        { error: 'News item not found' },
        { status: 404 }
      );
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content,
        author: {
          connect: { id: payload.userId },
        },
        news: {
          connect: { id: newsId },
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

    // Create a notification for the news author if they're not the commenter
    if (newsItem.authorId !== payload.userId) {
      await prisma.notification.create({
        data: {
          title: 'New Comment',
          content: `Someone commented on your post: "${newsItem.title.substring(0, 30)}${newsItem.title.length > 30 ? '...' : ''}"`,
          type: 'NEWS',
          user: {
            connect: { id: newsItem.authorId },
          },
        },
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
});