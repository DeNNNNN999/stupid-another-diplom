import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { JwtPayload } from '@/lib/auth';

// Join a conference
export const POST = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { conferenceId: string } }
) => {
  try {
    const { conferenceId } = params;

    // Check if the conference exists and is active
    const conference = await prisma.conference.findUnique({
      where: {
        id: conferenceId,
        isActive: true,
      },
    });

    if (!conference) {
      return NextResponse.json(
        { error: 'Conference not found or not active' },
        { status: 404 }
      );
    }

    // Check if user is already a participant
    const existingParticipant = await prisma.conferenceUser.findUnique({
      where: {
        conferenceId_userId: {
          conferenceId,
          userId: payload.userId,
        },
      },
    });

    if (existingParticipant) {
      // If already joined but left, update the record
      if (existingParticipant.leftAt) {
        await prisma.conferenceUser.update({
          where: {
            conferenceId_userId: {
              conferenceId,
              userId: payload.userId,
            },
          },
          data: {
            leftAt: null,
          },
        });
      }
    } else {
      // Add user as a participant
      await prisma.conferenceUser.create({
        data: {
          conferenceId,
          userId: payload.userId,
          isHost: false,
        },
      });
    }

    return NextResponse.json({ message: 'Joined conference successfully' });
  } catch (error) {
    console.error('Error joining conference:', error);
    return NextResponse.json(
      { error: 'Failed to join conference' },
      { status: 500 }
    );
  }
});

// Leave a conference
export const DELETE = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { conferenceId: string } }
) => {
  try {
    const { conferenceId } = params;

    // Check if user is a participant
    const participant = await prisma.conferenceUser.findUnique({
      where: {
        conferenceId_userId: {
          conferenceId,
          userId: payload.userId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'You are not a participant in this conference' },
        { status: 404 }
      );
    }

    // Update the record with leftAt timestamp
    await prisma.conferenceUser.update({
      where: {
        conferenceId_userId: {
          conferenceId,
          userId: payload.userId,
        },
      },
      data: {
        leftAt: new Date(),
      },
    });

    return NextResponse.json({ message: 'Left conference successfully' });
  } catch (error) {
    console.error('Error leaving conference:', error);
    return NextResponse.json(
      { error: 'Failed to leave conference' },
      { status: 500 }
    );
  }
});