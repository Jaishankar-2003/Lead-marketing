import { SearchInput } from '../types';
import { expandCategory, SubcategoryMeta } from './categoryTaxonomy';
import { buildLocationGrids, LocationGrid } from './locationValidator';

/**
 * Builds diverse search engine queries across expanded subcategories and area grids.
 */
export function buildSearchQueries(input: SearchInput): Array<{ query: string; category: string }> {
  const { area, city, country } = input;
  const subcategories = expandCategory(input.category, input.maxSubcategories || 8);
  const queries: Array<{ query: string; category: string }> = [];

  for (const sub of subcategories) {
    const kw = sub.searchKeyword;

    // Pattern 1: Direct subcategory in target area
    queries.push({
      query: `${kw} in ${area} ${city}`,
      category: sub.name,
    });

    // Pattern 2: Contact intent search (surfaces local business pages)
    queries.push({
      query: `"${kw}" "${area}" ${city} "phone" OR "contact"`,
      category: sub.name,
    });

    // Pattern 3: Official website search
    queries.push({
      query: `${kw} ${area} ${city} ${country} official website`,
      category: sub.name,
    });
  }

  return queries;
}

/**
 * Builds Google Maps queries combining expanded subcategories and localized street grids.
 */
export function buildGoogleMapsQueries(input: SearchInput): Array<{ query: string; category: string }> {
  const { area, city } = input;
  const subcategories = expandCategory(input.category, input.maxSubcategories || 10);
  const grids = buildLocationGrids(area, city);
  const queries: Array<{ query: string; category: string }> = [];

  // 1. Primary subcategories in the main area
  for (const sub of subcategories) {
    queries.push({
      query: `${sub.searchKeyword} in ${area}, ${city}`,
      category: sub.name,
    });
  }

  // 2. High-density commercial street grids
  for (const grid of grids.slice(0, 4)) {
    queries.push({
      query: `Shops in ${grid.querySuffix}`,
      category: input.category,
    });
  }

  return queries;
}

/**
 * Builds Justdial search URLs for expanded subcategories.
 */
export function buildJustdialUrls(input: SearchInput): Array<{ url: string; category: string }> {
  const subcategories = expandCategory(input.category, 4);
  const a = input.area.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const c = input.city.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return subcategories.map((sub) => {
    const cat = encodeURIComponent(sub.searchKeyword);
    return {
      url: `https://www.justdial.com/${c}/${cat}/${a}`,
      category: sub.name,
    };
  });
}

/**
 * Builds Sulekha URL for local category search.
 */
export function buildSulekhaUrl(category: string, city: string): string {
  const cat = (category || 'businesses').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const c = city.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `https://www.sulekha.com/${cat}/${c}`;
}
