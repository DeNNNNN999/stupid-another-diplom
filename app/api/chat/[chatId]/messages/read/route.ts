import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import type { JwtPayload } from '@/src/lib/auth';

export const POST = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const chatId = request.url.split('/').slice(-3)[0];

    // Update all unread messages in this chat for the current user
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
});
