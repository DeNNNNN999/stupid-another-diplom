import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import type { JwtPayload } from '@/lib/auth';

// Revoke/delete an access code
export const DELETE = requireAdmin(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { codeId: string } }
) => {
  try {
    const { codeId } = params;

    // Check if the code exists
    const accessCode = await prisma.accessCode.findUnique({
      where: { id: codeId },
    });

    if (!accessCode) {
      return NextResponse.json(
        { error: 'Access code not found' },
        { status: 404 }
      );
    }

    // Check if the code is already used
    if (accessCode.isUsed) {
      return NextResponse.json(
        { error: 'Cannot revoke a code that has already been used' },
        { status: 400 }
      );
    }

    // Delete the code
    await prisma.accessCode.delete({
      where: { id: codeId },
    });

    return NextResponse.json({ message: 'Access code revoked successfully' });
  } catch (error) {
    console.error('Error revoking access code:', error);
    return NextResponse.json(
      { error: 'Failed to revoke access code' },
      { status: 500 }
    );
  }
});