import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId')?.trim();
    const level = searchParams.get('level')?.trim();

    const where: any = { isActive: true };
    if (parentId) where.parentId = parentId;
    if (level && level !== 'ALL') where.level = level;

    // Fetch all locations to construct tree or flat list
    const allLocations = await prisma.vendorLocation.findMany({
      where,
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    // Group into states, cities, and markets
    const states = allLocations.filter((l) => l.level === 'STATE');
    const cities = allLocations.filter((l) => l.level === 'CITY');
    const markets = allLocations.filter((l) => l.level === 'MARKET' || l.level === 'AREA');

    return NextResponse.json({
      success: true,
      locations: allLocations,
      states,
      cities,
      markets,
    });
  } catch (error) {
    console.error('GET /api/vendors/locations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const level = typeof body.level === 'string' ? body.level.trim().toUpperCase() : 'CITY';
    const parentId = body.parentId || null;
    const aliases = Array.isArray(body.aliases) ? body.aliases : [];

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Location name is required' },
        { status: 400 }
      );
    }

    const normalizedName = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    const location = await prisma.vendorLocation.create({
      data: {
        name,
        normalizedName,
        level,
        country: 'India',
        aliases,
        parentId,
      },
    });

    return NextResponse.json({
      success: true,
      location,
    });
  } catch (error) {
    console.error('POST /api/vendors/locations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create location' },
      { status: 500 }
    );
  }
}
