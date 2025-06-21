import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import type { JwtPayload } from '@/src/lib/auth';

// Get messages for a specific chat room
export const GET = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload
) => {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const chatId = pathParts[pathParts.indexOf('chat') + 1];
    
    const page = parseInt(request.nextUrl.searchParams.get('page') || '0');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');

    // Verify user belongs to this chat
    const membership = await prisma.chatRoomUser.findUnique({
      where: {
        chatRoomId_userId: {
          chatRoomId: chatId,
          userId: payload.userId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this chat room' },
        { status: 403 }
      );
    }

    // Get messages with pagination
    const messages = await prisma.message.findMany({
      where: {
        chatRoomId: chatId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      skip: page * limit,
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    // Mark unread messages as read
    await prisma.message.updateMany({
      where: {
        chatRoomId: chatId,
        recipientId: payload.userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve messages' },
      { status: 500 }
    );
  }
});

// Send a new message to a chat room
export const POST = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload
) => {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const chatId = pathParts[pathParts.indexOf('chat') + 1];
    
    const { content, attachments } = await request.json();

    // Verify user belongs to this chat
    const membership = await prisma.chatRoomUser.findUnique({
      where: {
        chatRoomId_userId: {
          chatRoomId: chatId,
          userId: payload.userId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this chat room' },
        { status: 403 }
      );
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content,
        attachments: attachments || [],
        sender: {
          connect: { id: payload.userId },
        },
        chatRoom: {
          connect: { id: chatId },
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
});
