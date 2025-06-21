import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import type { JwtPayload } from '@/src/lib/auth';

// Get all chat rooms for a user
export const GET = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        users: {
          some: {
            userId: payload.userId,
          },
        },
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            sender: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Transform the data for a cleaner response
    const transformedRooms = await Promise.all(
      chatRooms.map(async (chatRoom) => {
        // Count unread messages
        const unreadCount = await prisma.message.count({
          where: {
            chatRoomId: chatRoom.id,
            recipientId: payload.userId,
            isRead: false,
          },
        });

        return {
          id: chatRoom.id,
          name: chatRoom.name,
          isGroup: chatRoom.isGroup,
          users: chatRoom.users,
          lastMessage: chatRoom.messages[0] ? {
            content: chatRoom.messages[0].content,
            createdAt: chatRoom.messages[0].createdAt,
            sender: {
              name: chatRoom.messages[0].sender.name,
            },
          } : undefined,
          unreadCount,
          createdAt: chatRoom.createdAt,
          updatedAt: chatRoom.updatedAt,
        };
      })
    );

    return NextResponse.json(transformedRooms);
  } catch (error) {
    console.error('Error getting chat rooms:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve chat rooms' },
      { status: 500 }
    );
  }
});

// Create a new chat room
export const POST = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const { name, description, isGroup, userIds } = await request.json();

    // Ensure we have at least one other participant
    if (!userIds || userIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one participant is required' },
        { status: 400 }
      );
    }

    // For direct messages, check if a chat already exists
    if (!isGroup && userIds.length === 1) {
      const existingChat = await prisma.chatRoom.findFirst({
        where: {
          isGroup: false,
          AND: [
            {
              users: {
                some: {
                  userId: payload.userId,
                },
              },
            },
            {
              users: {
                some: {
                  userId: userIds[0],
                },
              },
            },
          ],
        },
        include: {
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profileImage: true,
                },
              },
            },
          },
        },
      });

      if (existingChat) {
        return NextResponse.json(existingChat);
      }
    }

    // Create the chat room
    const chatRoom = await prisma.chatRoom.create({
      data: {
        name: isGroup ? name : undefined,
        isGroup,
        users: {
          create: [
            // Current user (creator) is always an admin for groups
            {
              userId: payload.userId,
              isAdmin: isGroup,
            },
            // Add other participants
            ...userIds.map((id: string) => ({
              userId: id,
              isAdmin: false,
            })),
          ],
        },
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(chatRoom, { status: 201 });
  } catch (error) {
    console.error('Error creating chat room:', error);
    return NextResponse.json(
      { error: 'Failed to create chat room' },
      { status: 500 }
    );
  }
});
