/**
 * Category Taxonomy & Expansion Engine
 * Automatically expands broad business terms into rich, specific commercial subcategories
 * to maximize local business discovery without query overlap.
 */

export interface SubcategoryMeta {
  name: string;
  searchKeyword: string;
  itHardwareLikelihood: 'HIGH' | 'MEDIUM' | 'LOW'; // POS billing, workstations, networking
}

const TAXONOMY_MAP: Record<string, SubcategoryMeta[]> = {
  // 1. Retail Shops & Showrooms Expansion
  retail: [
    { name: 'Supermarkets & Departmental Stores', searchKeyword: 'Supermarket', itHardwareLikelihood: 'HIGH' },
    { name: 'Grocery & Provision Stores', searchKeyword: 'Grocery shop', itHardwareLikelihood: 'MEDIUM' },
    { name: 'Clothing & Garment Stores', searchKeyword: 'Clothing store', itHardwareLikelihood: 'MEDIUM' },
    { name: 'Textile & Saree Showrooms', searchKeyword: 'Textile showroom', itHardwareLikelihood: 'HIGH' },
    { name: 'Mobile Phone & Accessories Stores', searchKeyword: 'Mobile shop', itHardwareLikelihood: 'HIGH' },
    { name: 'Electronics & Gadget Stores', searchKeyword: 'Electronics shop', itHardwareLikelihood: 'HIGH' },
    { name: 'Computer & Laptop Dealers', searchKeyword: 'Computer shop', itHardwareLikelihood: 'HIGH' },
    { name: 'Hardware, Paints & Sanitary Stores', searchKeyword: 'Hardware store', itHardwareLikelihood: 'MEDIUM' },
    { name: 'Pharmacies & Medical Stores', searchKeyword: 'Medical store pharmacy', itHardwareLikelihood: 'HIGH' },
    { name: 'Furniture & Interior Showrooms', searchKeyword: 'Furniture shop', itHardwareLikelihood: 'MEDIUM' },
    { name: 'Footwear & Shoe Showrooms', searchKeyword: 'Footwear shop', itHardwareLikelihood: 'MEDIUM' },
    { name: 'Stationery & Book Stores', searchKeyword: 'Stationery shop', itHardwareLikelihood: 'LOW' },
    { name: 'Gift & Fancy Showrooms', searchKeyword: 'Gift shop', itHardwareLikelihood: 'LOW' },
    { name: 'Electrical Goods & Lighting', searchKeyword: 'Electrical shop', itHardwareLikelihood: 'MEDIUM' },
    { name: 'Home Appliances & TV Showrooms', searchKeyword: 'Home appliance shop', itHardwareLikelihood: 'HIGH' },
    { name: 'Jewellery & Gold Showrooms', searchKeyword: 'Jewellery showroom', itHardwareLikelihood: 'HIGH' },
    { name: 'Optical & Eyewear Showrooms', searchKeyword: 'Optical store', itHardwareLikelihood: 'MEDIUM' },
    { name: 'Bakeries & Sweet Stalls', searchKeyword: 'Bakery sweets', itHardwareLikelihood: 'MEDIUM' },
  ],

  // 2. Clinics & Healthcare Expansion
  clinics: [
    { name: 'Dental Clinics & Dental Hospitals', searchKeyword: 'Dental clinic', itHardwareLikelihood: 'HIGH' },
    { name: 'Eye Hospitals & Optical Care', searchKeyword: 'Eye clinic hospital', itHardwareLikelihood: 'HIGH' },
    { name: 'Diagnostic Labs & Scan Centres', searchKeyword: 'Diagnostic laboratory scan centre', itHardwareLikelihood: 'HIGH' },
    { name: 'Polyclinics & Nursing Homes', searchKeyword: 'Polyclinic nursing home', itHardwareLikelihood: 'HIGH' },
    { name: 'Skin & Dermatology Clinics', searchKeyword: 'Skin clinic dermatologist', itHardwareLikelihood: 'HIGH' },
    { name: 'Orthopaedic Clinics', searchKeyword: 'Orthopaedic hospital clinic', itHardwareLikelihood: 'HIGH' },
    { name: 'Children & Paediatric Clinics', searchKeyword: 'Child clinic paediatrician', itHardwareLikelihood: 'HIGH' },
  ],

  // 3. Education & Coaching Expansion
  education: [
    { name: 'Matriculation & CBSE Schools', searchKeyword: 'School', itHardwareLikelihood: 'HIGH' },
    { name: 'Tuition & Coaching Centres', searchKeyword: 'Coaching centre institute', itHardwareLikelihood: 'HIGH' },
    { name: 'Computer Training Institutes', searchKeyword: 'Computer training institute', itHardwareLikelihood: 'HIGH' },
    { name: 'Colleges & Higher Education', searchKeyword: 'College academy', itHardwareLikelihood: 'HIGH' },
  ],

  // 4. Professional Offices & Services Expansion
  offices: [
    { name: 'Chartered Accountants & Auditors', searchKeyword: 'Chartered Accountant CA office', itHardwareLikelihood: 'HIGH' },
    { name: 'Law Firms & Advocates', searchKeyword: 'Advocate law office', itHardwareLikelihood: 'HIGH' },
    { name: 'Tax Consultants & GST Filing', searchKeyword: 'Tax consultant GST office', itHardwareLikelihood: 'HIGH' },
    { name: 'Logistics & Courier Services', searchKeyword: 'Courier logistics office', itHardwareLikelihood: 'HIGH' },
    { name: 'Financial Consultancies', searchKeyword: 'Finance loan consultancy', itHardwareLikelihood: 'HIGH' },
    { name: 'Real Estate & Builders', searchKeyword: 'Real estate builder promoter office', itHardwareLikelihood: 'HIGH' },
  ],
};

/**
 * Expands a given input category string into relevant, focused subcategories.
 */
export function expandCategory(rawCategory: string, maxSubcategories = 12): SubcategoryMeta[] {
  const norm = (rawCategory || '').toLowerCase().trim();

  // Match Retail
  if (
    norm.includes('retail') ||
    norm.includes('shop') ||
    norm.includes('store') ||
    norm.includes('market') ||
    norm.includes('commercial') ||
    norm === 'businesses'
  ) {
    return TAXONOMY_MAP.retail.slice(0, maxSubcategories);
  }

  // Match Clinics / Healthcare
  if (
    norm.includes('clinic') ||
    norm.includes('hospital') ||
    norm.includes('doctor') ||
    norm.includes('health') ||
    norm.includes('medical')
  ) {
    return TAXONOMY_MAP.clinics.slice(0, maxSubcategories);
  }

  // Match Education
  if (
    norm.includes('school') ||
    norm.includes('college') ||
    norm.includes('education') ||
    norm.includes('academy') ||
    norm.includes('tuition')
  ) {
    return TAXONOMY_MAP.education.slice(0, maxSubcategories);
  }

  // Match Offices
  if (
    norm.includes('office') ||
    norm.includes('account') ||
    norm.includes('ca ') ||
    norm.includes('consultant') ||
    norm.includes('service')
  ) {
    return TAXONOMY_MAP.offices.slice(0, maxSubcategories);
  }

  // Fallback: If specific subcategory passed (e.g. "Footwear shops" or "Dental"), return it directly
  return [
    { name: rawCategory, searchKeyword: rawCategory, itHardwareLikelihood: 'HIGH' },
  ];
}

