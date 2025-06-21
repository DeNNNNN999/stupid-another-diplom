import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { JwtPayload } from '@/lib/auth';

// Get documents with filtering and pagination
export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '0');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
    const category = request.nextUrl.searchParams.get('category');
    const search = request.nextUrl.searchParams.get('search');

    // Build the where clause based on filters
    let whereClause: any = {};
    
    if (category) {
      whereClause.category = category;
    }
    
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { filename: { contains: search, mode: 'insensitive' } },
      ];
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: {
        updatedAt: 'desc',
      },
      skip: page * limit,
      take: limit,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    // Get total count for pagination
    const total = await prisma.document.count({ where: whereClause });

    // Get all available categories for filtering
    const categories = await prisma.document.groupBy({
      by: ['category'],
    });

    return NextResponse.json({
      documents,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        categories: categories.map(c => c.category),
      },
    });
  } catch (error) {
    console.error('Error getting documents:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve documents' },
      { status: 500 }
    );
  }
});

// Upload a new document
export const POST = requireAuth(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const { title, description, filename, fileUrl, fileSize, fileType, category } = await request.json();

    if (!title || !filename || !fileUrl || !fileSize || !fileType || !category) {
      return NextResponse.json(
        { error: 'Missing required fields for document upload' },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        title,
        description,
        filename,
        fileUrl,
        fileSize,
        fileType,
        category,
        uploader: {
          connect: { id: payload.userId },
        },
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
});