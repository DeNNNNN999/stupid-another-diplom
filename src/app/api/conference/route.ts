import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { JwtPayload } from '@/lib/auth';

// Get all active conferences
export const GET = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const upcoming = request.nextUrl.searchParams.get('upcoming') === 'true';
    const past = request.nextUrl.searchParams.get('past') === 'true';
    
    // Build the query based on parameters
    let whereClause = {};
    
    if (upcoming) {
      whereClause = {
        startTime: {
          gt: new Date(),
        },
      };
    } else if (past) {
      whereClause = {
        endTime: {
          lt: new Date(),
        },
      };
    } else {
      // Default: active conferences
      whereClause = {
        isActive: true,
      };
    }

    const conferences = await prisma.conference.findMany({
      where: whereClause,
      include: {
        participants: {
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
      orderBy: {
        startTime: 'asc',
      },
    });

    return NextResponse.json(conferences);
  } catch (error) {
    console.error('Error getting conferences:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve conferences' },
      { status: 500 }
    );
  }
});

// Create a new conference
export const POST = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const { title, description, startTime, participantIds } = await request.json();

    if (!title || !startTime) {
      return NextResponse.json(
        { error: 'Title and start time are required' },
        { status: 400 }
      );
    }

    // Create the conference
    const conference = await prisma.conference.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        participants: {
          create: [
            // Creator is the host
            {
              userId: payload.userId,
              isHost: true,
            },
            // Add other participants if provided
            ...(participantIds || []).map((id: string) => ({
              userId: id,
              isHost: false,
            })),
          ],
        },
      },
      include: {
        participants: {
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

    // Create notifications for all participants
    const notificationPromises = participantIds.map((userId: string) =>
      prisma.notification.create({
        data: {
          title: 'New Conference Invitation',
          content: `You've been invited to "${title}" conference starting at ${new Date(startTime).toLocaleString()}`,
          type: 'CONFERENCE',
          user: {
            connect: { id: userId },
          },
        },
      })
    );

    await Promise.all(notificationPromises);

    return NextResponse.json(conference, { status: 201 });
  } catch (error) {
    console.error('Error creating conference:', error);
    return NextResponse.json(
      { error: 'Failed to create conference' },
      { status: 500 }
    );
  }
});