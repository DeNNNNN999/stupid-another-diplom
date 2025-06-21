import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import type { JwtPayload } from '@/src/lib/auth';

// Update user status (active/inactive)
export const PATCH = requireAdmin(async (
  request: NextRequest,
  payload: JwtPayload
) => {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userIdIndex = pathParts.indexOf('users') + 1;
    const userId = pathParts[userIdIndex];

    const { isActive } = await request.json();

    // Cannot deactivate yourself
    if (userId === payload.userId && !isActive) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { error: 'Failed to update user status' },
      { status: 500 }
    );
  }
});
