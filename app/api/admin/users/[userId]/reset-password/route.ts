import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireAdmin, hashPassword } from '@/src/lib/auth';
import type { JwtPayload } from '@/src/lib/auth';
import crypto from 'crypto';

// Reset user password
export const POST = requireAdmin(async (
  request: NextRequest,
  payload: JwtPayload
) => {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userIdIndex = pathParts.indexOf('users') + 1;
    const userId = pathParts[userIdIndex];

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate a new random password
    const newPassword = crypto.randomBytes(4).toString('hex') + 'Aa1!';
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      message: 'Password reset successfully',
      newPassword,
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
});
