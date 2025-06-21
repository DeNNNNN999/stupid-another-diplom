import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { JwtPayload } from '@/lib/auth';

// Get all chat rooms for a user
export const GET = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const chatRooms = await prisma.chatRoomUser.findMany({
      where: {
        userId: payload.userId,
      },
      include: {
        chatRoom: {
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
            },
          },
        },
      },
    });

    // Transform the data for a cleaner response
    const transformedRooms = chatRooms.map(({ chatRoom }) => ({
      id: chatRoom.id,
      name: chatRoom.name || chatRoom.users
        .filter(u => u.user.id !== payload.userId)
        .map(u => u.user.name)
        .join(', '),
      isGroup: chatRoom.isGroup,
      participants: chatRoom.users.map(u => ({
        id: u.user.id,
        name: u.user.name,
        email: u.user.email,
        profileImage: u.user.profileImage,
        isAdmin: u.isAdmin,
      })),
      lastMessage: chatRoom.messages[0] || null,
      createdAt: chatRoom.createdAt,
      updatedAt: chatRoom.updatedAt,
    }));

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
    const { name, isGroup, participantIds } = await request.json();

    // Ensure we have at least one other participant
    if (!participantIds || participantIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one participant is required' },
        { status: 400 }
      );
    }

    // For direct messages, check if a chat already exists
    if (!isGroup && participantIds.length === 1) {
      const existingChat = await prisma.chatRoom.findFirst({
        where: {
          isGroup: false,
          users: {
            every: {
              userId: {
                in: [payload.userId, participantIds[0]],
              },
            },
          },
        },
      });

      if (existingChat) {
        return NextResponse.json(
          { error: 'Chat already exists', chatRoomId: existingChat.id },
          { status: 409 }
        );
      }
    }

    // Create the chat room
    const chatRoom = await prisma.chatRoom.create({
      data: {
        name: isGroup ? name : undefined,
        isGroup,
        users: {
          create: [
            // Current user (creator) is always an admin
            {
              userId: payload.userId,
              isAdmin: true,
            },
            // Add other participants
            ...participantIds.map((id: string) => ({
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