import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { JwtPayload } from '@/lib/auth';

// Get a specific conference
export const GET = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { conferenceId: string } }
) => {
  try {
    const { conferenceId } = params;

    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
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

    if (!conference) {
      return NextResponse.json(
        { error: 'Conference not found' },
        { status: 404 }
      );
    }

    // Check if the user is a participant
    const isParticipant = conference.participants.some(
      (p) => p.userId === payload.userId
    );

    if (!isParticipant && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You do not have access to this conference' },
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
export const PATCH = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { conferenceId: string } }
) => {
  try {
    const { conferenceId } = params;
    const { title, description, startTime, endTime, isActive } = await request.json();

    // Check if user is host or admin
    const conferenceUser = await prisma.conferenceUser.findUnique({
      where: {
        conferenceId_userId: {
          conferenceId,
          userId: payload.userId,
        },
      },
    });

    const isHost = conferenceUser?.isHost;
    const isAdmin = payload.role === 'ADMIN';

    if (!isHost && !isAdmin) {
      return NextResponse.json(
        { error: 'Only hosts or admins can update conferences' },
        { status: 403 }
      );
    }

    // Update the conference
    const updatedConference = await prisma.conference.update({
      where: { id: conferenceId },
      data: {
        title,
        description,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        isActive,
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
    if (updatedConference) {
      const notificationPromises = updatedConference.participants.map((participant) =>
        prisma.notification.create({
          data: {
            title: 'Conference Updated',
            content: `The conference "${updatedConference.title}" has been updated`,
            type: 'CONFERENCE',
            user: {
              connect: { id: participant.userId },
            },
          },
        })
      );

      await Promise.all(notificationPromises);
    }

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
export const DELETE = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { conferenceId: string } }
) => {
  try {
    const { conferenceId } = params;

    // Check if user is host or admin
    const conferenceUser = await prisma.conferenceUser.findUnique({
      where: {
        conferenceId_userId: {
          conferenceId,
          userId: payload.userId,
        },
      },
    });

    const isHost = conferenceUser?.isHost;
    const isAdmin = payload.role === 'ADMIN';

    if (!isHost && !isAdmin) {
      return NextResponse.json(
        { error: 'Only hosts or admins can delete conferences' },
        { status: 403 }
      );
    }

    // Get conference details for notifications
    const conference = await prisma.conference.findUnique({
      where: { id: conferenceId },
      include: {
        participants: true,
      },
    });

    if (!conference) {
      return NextResponse.json(
        { error: 'Conference not found' },
        { status: 404 }
      );
    }

    // Create notifications for all participants
    const notificationPromises = conference.participants.map((participant) =>
      prisma.notification.create({
        data: {
          title: 'Conference Cancelled',
          content: `The conference "${conference.title}" has been cancelled`,
          type: 'CONFERENCE',
          user: {
            connect: { id: participant.userId },
          },
        },
      })
    );

    // Delete the conference and create notifications
    await prisma.$transaction([
      prisma.conferenceUser.deleteMany({
        where: { conferenceId },
      }),
      prisma.conference.delete({
        where: { id: conferenceId },
      }),
      ...notificationPromises,
    ]);

    return NextResponse.json({ message: 'Conference deleted successfully' });
  } catch (error) {
    console.error('Error deleting conference:', error);
    return NextResponse.json(
      { error: 'Failed to delete conference' },
      { status: 500 }
    );
  }
});