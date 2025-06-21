import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Get all users as contacts with filtering
export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const search = request.nextUrl.searchParams.get('search') || '';
    const department = request.nextUrl.searchParams.get('department') || '';
    const page = parseInt(request.nextUrl.searchParams.get('page') || '0');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

    // Build the where clause based on filters
    let whereClause: any = {
      isActive: true, // Only show active users
    };
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (department) {
      whereClause.department = department;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        position: true,
        phoneNumber: true,
        profileImage: true,
      },
      orderBy: {
        name: 'asc',
      },
      skip: page * limit,
      take: limit,
    });

    // Get total count for pagination
    const total = await prisma.user.count({ where: whereClause });

    // Get all departments for filtering
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
    console.error('Error getting contacts:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve contacts' },
      { status: 500 }
    );
  }
});