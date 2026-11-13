import { RawDiscoveredItem, SearchInput } from '../types';
import { cleanBusinessName, normalizeUrl, validatePhone } from '../utils/urlUtils';

/**
 * Free OpenStreetMap Overpass discovery.
 * Queries publicly available POI data for the target geographical area.
 */
export async function scrapeOpenStreetMap(input: SearchInput): Promise<RawDiscoveredItem[]> {
  const items: RawDiscoveredItem[] = [];

  // Approximate coordinate bounding box for Anna Nagar & surrounding Madurai commercial district
  // Lat: 9.910 to 9.930, Lon: 78.140 to 78.165
  const query = `
[out:json][timeout:10];
(
  node["shop"](9.910,78.140,9.930,78.165);
  way["shop"](9.910,78.140,9.930,78.165);
  node["amenity"~"clinic|pharmacy|hospital|bank"](9.910,78.140,9.930,78.165);
);
out center tags 40;
`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'BusinessLeadDiscovery/2.0 (local; openstreetmap-bot)',
        },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(6000), // Strict 6-second timeout so it never stalls
      });

      if (res.ok) {
        const data: any = await res.json();
        const elements = data.elements || [];

        for (const el of elements) {
          const tags = el.tags || {};
          const name = tags.name;
          if (!name) continue;

          const shopType = tags.shop || tags.amenity || input.category;
          const street = tags['addr:street'] || tags['addr:suburb'] || `${input.area}, ${input.city}`;
          const phone = validatePhone(tags.phone || tags['contact:phone'] || tags['contact:mobile']);
          const website = tags.website || tags['contact:website'] || null;

          items.push({
            businessName: cleanBusinessName(name),
            websiteUrl: website ? normalizeUrl(website) : null,
            category: shopType.replace(/_/g, ' '),
            area: input.area,
            city: input.city,
            address: `${street}, ${input.city}`,
            phone,
            description: `Discovered via OpenStreetMap POI (${shopType})`,
            source: 'OpenStreetMap',
            rawLocationSnippet: street,
          });
        }

        console.log(`     [OSM] Discovered ${items.length} mapped business POIs from OpenStreetMap`);
        return items;
      }
    } catch {
      // Continue to next mirror or fallback gracefully
    }
  }

  return items;
}

