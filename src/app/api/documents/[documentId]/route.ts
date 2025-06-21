import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { JwtPayload } from '@/lib/auth';

// Get a specific document
export const GET = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { documentId: string } }
) => {
  try {
    const { documentId } = params;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        previousVersion: true,
        nextVersion: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error getting document:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve document' },
      { status: 500 }
    );
  }
});

// Update a document (new version)
export const POST = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { documentId: string } }
) => {
  try {
    const { documentId } = params;
    const { title, description, filename, fileUrl, fileSize, fileType, category } = await request.json();

    // Check if the document exists
    const existingDocument = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Create a new version of the document
    const newDocument = await prisma.document.create({
      data: {
        title: title || existingDocument.title,
        description: description || existingDocument.description,
        filename: filename || existingDocument.filename,
        fileUrl: fileUrl || existingDocument.fileUrl,
        fileSize: fileSize || existingDocument.fileSize,
        fileType: fileType || existingDocument.fileType,
        category: category || existingDocument.category,
        version: existingDocument.version + 1,
        previousVersion: {
          connect: { id: documentId },
        },
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
        previousVersion: true,
      },
    });

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
});

// Delete a document
export const DELETE = requireAuth(async (
  request: NextRequest,
  payload: JwtPayload,
  { params }: { params: { documentId: string } }
) => {
  try {
    const { documentId } = params;

    // Get the document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check permissions (uploader or admin)
    if (document.uploaderId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You do not have permission to delete this document' },
        { status: 403 }
      );
    }

    // If this document is referenced by another as previous version, update that reference
    if (document.nextVersion) {
      await prisma.document.update({
        where: { id: document.nextVersion.id },
        data: {
          previousVersionId: document.previousVersionId,
        },
      });
    }

    // Delete the document
    await prisma.document.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
});