import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse, PaginatedResponse } from '@/types';

// GET /api/alerts - Get system alerts with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type') || '';
    const severity = searchParams.get('severity') || '';
    const isRead = searchParams.get('isRead');
    const createdAfter = searchParams.get('createdAfter');

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    if (type) {
      whereClause.type = type;
    }

    if (severity) {
      whereClause.severity = severity;
    }

    if (isRead !== null && isRead !== undefined && isRead !== '') {
      whereClause.isRead = isRead === 'true';
    }

    if (createdAfter) {
      whereClause.createdAt = {
        gte: new Date(createdAfter)
      };
    }

    const [alerts, total] = await Promise.all([
      prisma.systemAlert.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.systemAlert.count({ where: whereClause }),
    ]);

    const response: PaginatedResponse<any> = {
      data: alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch alerts',
      },
      { status: 500 }
    );
  }
}

// POST /api/alerts - Create a new system alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      message,
      type,
      severity,
      targetRole,
    } = body;

    // Validate required fields
    if (!title || !message || !type || !severity) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title, message, type, and severity are required',
        },
        { status: 400 }
      );
    }

    // Create alert
    const alert = await prisma.systemAlert.create({
      data: {
        title,
        message,
        type,
        severity,
        targetRole: targetRole || null,
        isRead: false,
      },
    });

    const response: ApiResponse<any> = {
      success: true,
      data: alert,
      message: 'Alert created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create alert',
      },
      { status: 500 }
    );
  }
}