import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      totalVendors,
      activeVendors,
      pendingVerification,
      totalEnquiries,
      openEnquiries,
      quotationsCount,
      locationsWithCounts,
      recentActivities,
    ] = await Promise.all([
      prisma.vendor.count({ where: { status: { not: 'ARCHIVED' } } }),
      prisma.vendor.count({ where: { status: 'ACTIVE' } }),
      prisma.vendor.count({ where: { status: 'VERIFICATION_PENDING' } }),
      prisma.componentEnquiry.count(),
      prisma.componentEnquiry.count({ where: { status: 'OPEN' } }),
      prisma.vendorQuotation.count(),
      prisma.vendorLocation.findMany({
        where: { level: 'CITY' },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              vendorsAsCity: true,
            },
          },
        },
        orderBy: {
          vendorsAsCity: { _count: 'desc' },
        },
        take: 8,
      }),
      prisma.vendorActivityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          vendor: { select: { name: true, vendorCode: true } },
          enquiry: { select: { requestCode: true } },
        },
      }),
    ]);

    const cityBreakdown = locationsWithCounts.map((loc) => ({
      cityId: loc.id,
      cityName: loc.name,
      count: loc._count.vendorsAsCity,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalVendors,
        activeVendors,
        pendingVerification,
        totalEnquiries,
        openEnquiries,
        quotationsCount,
        cityBreakdown,
        recentActivities,
      },
    });
  } catch (error) {
    console.error('GET /api/vendors/stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendor statistics' },
      { status: 500 }
    );
  }
}
