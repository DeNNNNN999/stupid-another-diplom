import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import type { JwtPayload } from '@/src/lib/auth';
import crypto from 'crypto';

// Get all access codes with pagination
export const GET = requireAdmin(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '0');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const status = request.nextUrl.searchParams.get('status') || 'all';

    // Build where clause based on status filter
    let whereClause: any = {};
    
    if (status === 'active') {
      whereClause = {
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      };
    } else if (status === 'used') {
      whereClause = { isUsed: true };
    } else if (status === 'expired') {
      whereClause = {
        isUsed: false,
        expiresAt: {
          lt: new Date(),
        },
      };
    }

    const accessCodes = await prisma.accessCode.findMany({
      where: whereClause,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: page * limit,
      take: limit,
    });

    // Get total count for pagination
    const total = await prisma.accessCode.count({ where: whereClause });

    return NextResponse.json({
      accessCodes,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error getting access codes:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve access codes' },
      { status: 500 }
    );
  }
});

// Generate new access code(s)
export const POST = requireAdmin(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const { count = 1, expiresInDays = 7 } = await request.json();

    // Validate input
    const codeCount = Math.min(Math.max(parseInt(count.toString()), 1), 50); // Limit to 1-50
    const expireDays = Math.min(Math.max(parseInt(expiresInDays.toString()), 1), 90); // Limit to 1-90 days

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expireDays);

    // Generate access codes
    const generatedCodes = [];
    for (let i = 0; i < codeCount; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      const accessCode = await prisma.accessCode.create({
        data: {
          code,
          expiresAt,
          createdBy: payload.userId,
        },
      });
      
      generatedCodes.push(accessCode);
    }

    return NextResponse.json(generatedCodes, { status: 201 });
  } catch (error) {
    console.error('Error generating access codes:', error);
    return NextResponse.json(
      { error: 'Failed to generate access codes' },
      { status: 500 }
    );
  }
});
