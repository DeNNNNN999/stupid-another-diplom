import { prisma } from './db';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export async function authenticateRequest(request: NextRequest): Promise<JwtPayload | null> {
  const token = request.headers.get('authorization')?.split(' ')[1];
  
  if (!token) {
    return null;
  }
  
  try {
    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { isActive: true }
    });
    
    if (!user || !user.isActive) {
      return null;
    }
    
    // Update user's last activity time
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { updatedAt: new Date() }
    }).catch(err => {
      console.error('Failed to update user activity:', err);
    });
    
    return decoded;
  } catch (error) {
    return null;
  }
}

export function requireAuth(handler: (req: NextRequest, payload: JwtPayload) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const payload = await authenticateRequest(request);
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return handler(request, payload);
  };
}

export function requireAdmin(handler: (req: NextRequest, payload: JwtPayload) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const payload = await authenticateRequest(request);
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return handler(request, payload);
  };
}