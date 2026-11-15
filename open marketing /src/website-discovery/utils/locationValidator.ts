import { LocationStatus } from '../types';

export interface LocationGrid {
  name: string;
  querySuffix: string;
}

/**
 * Known sub-streets, landmarks, and micro-localities for high-intent areas in Madurai
 */
const MADURAI_LOCALITY_GRIDS: Record<string, string[]> = {
  'anna nagar': [
    '80 Feet Road Anna Nagar',
    'Kuruvikaran Salai Anna Nagar',
    'Sathamangalam Anna Nagar',
    'Ambika Theater Road Anna Nagar',
    'Melur Main Road Anna Nagar',
    'Housing Board Colony Anna Nagar',
    'Anna Nagar Main Road',
  ],
  'kk nagar': [
    'KK Nagar Main Road',
    'Mattuthavani KK Nagar',
    'Sundaram Park KK Nagar',
    'Lake View Road KK Nagar',
  ],
  'simmakkal': [
    'Simmakkal Main Road',
    'Yanaikkal Road',
    'Vakkil New Street Simmakkal',
  ],
  'goripalayam': [
    'Goripalayam Junction',
    'Alagarkoil Road Goripalayam',
    'Outpost Goripalayam',
    'Shenoy Nagar Goripalayam',
  ],
  'tallakulam': [
    'Tallakulam Main Road',
    'Gokhale Road Tallakulam',
    'Alagarkoil Road Tallakulam',
    'Outpost Tallakulam',
  ],
  'mattuthavani': [
    'Mattuthavani Bus Stand',
    'Ring Road Mattuthavani',
    'Omni Bus Stand Mattuthavani',
    'Melur Road Mattuthavani',
  ],
  'k pudur': [
    'K Pudur Main Road',
    'ITI Bus Stop K Pudur',
    'Alagar Nagar K Pudur',
    'New Natham Road Pudur',
  ],
  'kappalur': [
    'Kappalur Industrial Estate',
    'SIDCO Industrial Estate Kappalur',
    'Madurai Bypass Kappalur',
  ],
};

/**
 * Known neighboring/adjacent localities to distinguish exact vs nearby matches in Madurai
 */
const MADURAI_ADJACENT_AREAS: Record<string, string[]> = {
  'anna nagar': [
    'sathamangalam',
    'kuruvikaran salai',
    'shenoy nagar',
    'kk nagar',
    'gomathipuram',
    'yagappa nagar',
    'vandiyur',
    'tahsildar nagar',
    'mellur road',
  ],
  'kk nagar': [
    'anna nagar',
    'mattuthavani',
    'sathamangalam',
    'gomathipuram',
    'k pudur',
  ],
  'tallakulam': [
    'goripalayam',
    'gokhale road',
    'chinna chokkikulam',
    'narimedu',
    'bibikulam',
  ],
  'goripalayam': [
    'tallakulam',
    'sellur',
    'simmakkal',
    'alwarpuram',
  ],
  'simmakkal': [
    'periyar',
    'yanaikkal',
    'goripalayam',
    'south veli',
    'town hall road',
  ],
  'k pudur': [
    'alagar nagar',
    'suryanagar',
    'mattuthavani',
    'tallakulam',
    'koodal nagar',
  ],
  'mattuthavani': [
    'kk nagar',
    'k pudur',
    'uthangudi',
    'anna nagar',
  ],
};

/**
 * Distant Madurai localities (to flag CITY_ONLY_MATCH)
 */
const MADURAI_DISTANT_LOCALITIES = [
  'simmakkal', 'goripalayam', 'mattuthavani', 'periyar', 'ss colony',
  'villapuram', 'aarapalayam', 'kalavasal', 'south veli', 'west tower',
  'tvk nagar', 'palanganatham', 'thirunagar', 'nagamalai', 'sellur',
  'pasumalai', 'teppakulam', 'therku vasal', 'munichalai'
];

/**
 * Builds geographical sub-grids for any given area and city.
 */
export function buildLocationGrids(area: string, city: string): LocationGrid[] {
  const normArea = area.toLowerCase().trim();
  const specificGrids = MADURAI_LOCALITY_GRIDS[normArea];

  if (specificGrids && specificGrids.length > 0) {
    return specificGrids.map((g) => ({
      name: g,
      querySuffix: `${g}, ${city}`,
    }));
  }

  // Dynamic fallback for any area in any city
  return [
    { name: `${area} Main Road`, querySuffix: `${area} Main Road, ${city}` },
    { name: `${area} Commercial Area`, querySuffix: `${area} Commercial, ${city}` },
    { name: `${area} 1st Cross`, querySuffix: `${area} Cross Street, ${city}` },
    { name: `${area} Market`, querySuffix: `${area} Market, ${city}` },
  ];
}

/**
 * Validates whether a discovered business belongs to the target locality.
 */
export function validateLocation(
  address: string | null | undefined,
  targetArea: string,
  targetCity: string
): LocationStatus {
  if (!address || address.trim().length < 4) {
    return 'LOCATION_UNVERIFIED';
  }

  const text = address.toLowerCase();
  const normArea = targetArea.toLowerCase().trim();
  const normCity = targetCity.toLowerCase().trim();

  // 1. Check for Exact Area Match
  if (text.includes(normArea)) {
    return 'EXACT_AREA_MATCH';
  }

  // Check known streets/landmarks of target area
  const streets = MADURAI_LOCALITY_GRIDS[normArea] || [];
  for (const s of streets) {
    const sName = s.toLowerCase().replace(/anna nagar/g, '').trim();
    if (sName.length > 3 && text.includes(sName)) {
      return 'EXACT_AREA_MATCH';
    }
  }

  // 2. Check for Nearby / Adjacent Locality Match
  const nearbyList = MADURAI_ADJACENT_AREAS[normArea] || [];
  for (const nearby of nearbyList) {
    if (text.includes(nearby)) {
      return 'NEARBY_AREA_MATCH';
    }
  }

  // 3. Check for Distant Locality in the same City
  for (const distant of MADURAI_DISTANT_LOCALITIES) {
    if (text.includes(distant)) {
      return 'CITY_ONLY_MATCH';
    }
  }

  // 4. Matches City Name only
  if (text.includes(normCity)) {
    return 'CITY_ONLY_MATCH';
  }

  return 'LOCATION_UNVERIFIED';
}

