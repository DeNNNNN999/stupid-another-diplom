import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import type { JwtPayload } from '@/src/lib/auth';

// Get a specific conference
export const GET = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const conferenceId = pathParts[pathParts.indexOf('conference') + 1];

    const conference = await prisma.conference.findUnique({
      where: {
        id: conferenceId,
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

    if (!conference) {
      return NextResponse.json(
        { error: 'Conference not found' },
        { status: 404 }
      );
    }

    // Check if user is a participant
    const isParticipant = conference.participants.some(
      p => p.userId === payload.userId
    );

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'You are not a participant in this conference' },
        { status: 403 }
      );
    }

    return NextResponse.json(conference);
  } catch (error) {
    console.error('Error getting conference:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve conference' },
      { status: 500 }
    );
  }
});

// Update a conference
export const PUT = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const conferenceId = pathParts[pathParts.indexOf('conference') + 1];
    
    const { title, description, startTime, endTime, isActive } = await request.json();

    // Check if user is the host
    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      include: {
        participants: {
          where: { userId: payload.userId, isHost: true },
        },
      },
    });

    if (!conference || conference.participants.length === 0) {
      return NextResponse.json(
        { error: 'You are not authorized to update this conference' },
        { status: 403 }
      );
    }

    const updatedConference = await prisma.conference.update({
      where: { id: conferenceId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(isActive !== undefined && { isActive }),
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

    return NextResponse.json(updatedConference);
  } catch (error) {
    console.error('Error updating conference:', error);
    return NextResponse.json(
      { error: 'Failed to update conference' },
      { status: 500 }
    );
  }
});

// Delete a conference
export const DELETE = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const conferenceId = pathParts[pathParts.indexOf('conference') + 1];

    // Check if user is the host
    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      include: {
        participants: {
          where: { userId: payload.userId, isHost: true },
        },
      },
    });

    if (!conference || conference.participants.length === 0) {
      return NextResponse.json(
        { error: 'You are not authorized to delete this conference' },
        { status: 403 }
      );
    }

    // Delete the conference (this will cascade to participants)
    await prisma.conference.delete({
      where: { id: conferenceId },
    });

    return NextResponse.json({ message: 'Conference deleted successfully' });
  } catch (error) {
    console.error('Error deleting conference:', error);
    return NextResponse.json(
      { error: 'Failed to delete conference' },
      { status: 500 }
    );
  }
});