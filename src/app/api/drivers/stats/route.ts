import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get gender counts using Prisma's groupBy
    const genderCounts = await prisma.driver.groupBy({
      by: ['gender'],
      _count: {
        gender: true,
      },
    });

    // Transform the data into a more usable format
    const stats = {
      total: 0,
      male: 0,
      female: 0,
      other: 0,
    };

    genderCounts.forEach((item) => {
      const count = item._count.gender;
      stats.total += count;
      
      switch (item.gender) {
        case 'MALE':
          stats.male = count;
          break;
        case 'FEMALE':
          stats.female = count;
          break;
        case 'OTHER':
          stats.other = count;
          break;
      }
    });

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching driver statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch driver statistics',
      },
      { status: 500 }
    );
  }
}