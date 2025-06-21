import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { hashPassword, generateToken } from '@/src/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, accessCode } = await request.json();

    // Validate required fields
    if (!email || !password || !name || !accessCode) {
      return NextResponse.json(
        { error: 'Email, password, name, and access code are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }

    // Validate access code
    const validAccessCode = await prisma.accessCode.findFirst({
      where: {
        code: accessCode,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!validAccessCode) {
      return NextResponse.json(
        { error: 'Invalid or expired access code' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'EMPLOYEE', // Default role
        accessCodeId: validAccessCode.id,
      },
    });

    // Mark access code as used
    await prisma.accessCode.update({
      where: { id: validAccessCode.id },
      data: { isUsed: true },
    });

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.role);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}