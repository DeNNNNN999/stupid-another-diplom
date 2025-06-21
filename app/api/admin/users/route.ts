import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import type { JwtPayload } from '@/src/lib/auth';

// Get all users with filtering
export const GET = requireAdmin(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const department = searchParams.get('department');

    // Build where clause
    let whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (role && role !== 'all') {
      whereClause.role = role;
    }
    
    if (department && department !== 'all') {
      whereClause.department = department;
    }

    // Get users
    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        accessCode: {
          select: {
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: page * limit,
      take: limit,
    });

    // Get total count
    const total = await prisma.user.count({ where: whereClause });

    // Get all unique departments
    const departments = await prisma.user.groupBy({
      by: ['department'],
      where: {
        department: {
          not: null,
        },
      },
    });

    return NextResponse.json({
      users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        departments: departments.map(d => d.department).filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve users' },
      { status: 500 }
    );
  }
});
