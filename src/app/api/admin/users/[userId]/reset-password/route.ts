import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, hashPassword } from '@/lib/auth';
import type { JwtPayload } from '@/lib/auth';

// Reset a user's password
export const POST = requireAdmin(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { userId: string } }
) => {
  try {
    const { userId } = params;
    const { newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

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

    // Hash and update password
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Create notification for the user
    await prisma.notification.create({
      data: {
        title: 'Password Reset',
        content: 'Your password has been reset by an administrator.',
        type: 'SYSTEM',
        user: {
          connect: { id: userId },
        },
      },
    });

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
});