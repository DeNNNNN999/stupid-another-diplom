import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import type { JwtPayload } from '@/src/lib/auth';

// Get all conferences for a user
export const GET = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const conferences = await prisma.conference.findMany({
      where: {
        participants: {
          some: {
            userId: payload.userId,
          },
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
        _count: {
          select: {
            participants: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
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
    const { title, description, startTime, participants: participantIds = [] } = await request.json();

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
        isActive: new Date(startTime) <= new Date(), // Active if start time is now or in the past
        participants: {
          create: [
            // Creator is always the host
            {
              userId: payload.userId,
              isHost: true,
            },
            // Add other participants
            ...participantIds.map((id: string) => ({
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
        _count: {
          select: {
            participants: true,
          },
        },
      },
    });

    return NextResponse.json(conference, { status: 201 });
  } catch (error) {
    console.error('Error creating conference:', error);
    return NextResponse.json(
      { error: 'Failed to create conference' },
      { status: 500 }
    );
  }
});