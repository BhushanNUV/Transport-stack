import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, PaginatedResponse } from '@/types';
import alertStorage from '@/lib/alertStorage';
import { AlertType, AlertSeverity } from '@prisma/client';

// Default organization ID for demo purposes
const DEFAULT_ORG_ID = 'org_default';

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
    const organizationId = searchParams.get('organizationId') || DEFAULT_ORG_ID;

    const offset = (page - 1) * limit;

    // Get filtered alerts from storage
    const { alerts, total } = alertStorage.getAlerts({
      organizationId,
      type: type ? (type as AlertType) : undefined,
      severity: severity ? (severity as AlertSeverity) : undefined,
      isRead: isRead !== null && isRead !== undefined && isRead !== '' ? isRead === 'true' : undefined,
      createdAfter: createdAfter ? new Date(createdAfter) : undefined,
      limit,
      offset,
    });

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
      organizationId,
      metadata,
    } = body;

    // Use default organization ID if not provided
    const orgId = organizationId || DEFAULT_ORG_ID;

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

    // Create alert in storage
    const alert = alertStorage.createAlert({
      title,
      message,
      type,
      severity,
      targetRole: targetRole || null,
      organizationId: orgId,
      metadata: metadata || {},
      isRead: false,
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