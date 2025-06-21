import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import type { JwtPayload } from '@/lib/auth';

export const GET = requireAdmin(async (request: NextRequest, payload: JwtPayload) => {
  try {
    const reportType = request.nextUrl.searchParams.get('type') || 'activity';
    const period = request.nextUrl.searchParams.get('period') || 'week';
    
    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'quarter') {
      startDate.setMonth(startDate.getMonth() - 3);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }
    
    let reportData: any;
    
    // Activity report: count of new entities created over time
    if (reportType === 'activity') {
      const [users, messages, conferences, documents, news] = await Promise.all([
        prisma.user.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          _count: true,
        }),
        prisma.message.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          _count: true,
        }),
        prisma.conference.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          _count: true,
        }),
        prisma.document.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          _count: true,
        }),
        prisma.news.groupBy({
          by: ['publishedAt'],
          where: {
            publishedAt: {
              gte: startDate,
            },
          },
          _count: true,
        }),
      ]);
      
      reportData = {
        users,
        messages,
        conferences,
        documents,
        news,
        period,
        startDate,
        endDate: new Date(),
      };
    }
    // User report: statistics about users
    else if (reportType === 'users') {
      const [usersByRole, usersByDepartment, usersByActive] = await Promise.all([
        prisma.user.groupBy({
          by: ['role'],
          _count: true,
        }),
        prisma.user.groupBy({
          by: ['department'],
          _count: true,
        }),
        prisma.user.groupBy({
          by: ['isActive'],
          _count: true,
        }),
      ]);
      
      reportData = {
        usersByRole,
        usersByDepartment,
        usersByActive,
      };
    }
    // Content report: statistics about content
    else if (reportType === 'content') {
      const [documentsByCategory, newsByCategory, messageCount, conferenceCount] = await Promise.all([
        prisma.document.groupBy({
          by: ['category'],
          _count: true,
        }),
        prisma.news.groupBy({
          by: ['category'],
          _count: true,
        }),
        prisma.message.count(),
        prisma.conference.count(),
      ]);
      
      reportData = {
        documentsByCategory,
        newsByCategory,
        messageCount,
        conferenceCount,
      };
    }
    // Usage report: detailed usage metrics
    else if (reportType === 'usage') {
      const [activeChats, activeConferences, activeUsers, documentDownloads] = await Promise.all([
        prisma.chatRoom.count({
          where: {
            messages: {
              some: {
                createdAt: {
                  gte: startDate,
                },
              },
            },
          },
        }),
        prisma.conference.count({
          where: {
            participants: {
              some: {
                joinedAt: {
                  gte: startDate,
                },
              },
            },
          },
        }),
        prisma.user.count({
          where: {
            isActive: true,
            OR: [
              {
                sentMessages: {
                  some: {
                    createdAt: {
                      gte: startDate,
                    },
                  },
                },
              },
              {
                conferences: {
                  some: {
                    joinedAt: {
                      gte: startDate,
                    },
                  },
                },
              },
            ],
          },
        }),
        // This is a placeholder as we don't track document downloads directly
        prisma.document.count({
          where: {
            createdAt: {
              gte: startDate,
            },
          },
        }),
      ]);
      
      reportData = {
        activeChats,
        activeConferences,
        activeUsers,
        documentDownloads,
        period,
        startDate,
        endDate: new Date(),
      };
    }
    
    return NextResponse.json({
      type: reportType,
      period,
      data: reportData,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
});