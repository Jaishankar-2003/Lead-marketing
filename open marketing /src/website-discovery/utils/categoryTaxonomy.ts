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

  // 4. IT, Web Development & Computer Services (Target Service Expansion)
  it_services: [
    { name: 'Computer & Laptop Repair Shops', searchKeyword: 'Computer repair shop', itHardwareLikelihood: 'HIGH' },
    { name: 'Laptop Service Centers', searchKeyword: 'Laptop service center', itHardwareLikelihood: 'HIGH' },
    { name: 'Web Design & Development Companies', searchKeyword: 'Web design company', itHardwareLikelihood: 'HIGH' },
    { name: 'IT Support & Networking AMC Providers', searchKeyword: 'IT support networking AMC', itHardwareLikelihood: 'HIGH' },
    { name: 'Software Development & Tech Solutions', searchKeyword: 'Software development company', itHardwareLikelihood: 'HIGH' },
    { name: 'Printer Installation & Repair Services', searchKeyword: 'Printer repair service', itHardwareLikelihood: 'HIGH' },
    { name: 'CCTV Camera & Security Network Installers', searchKeyword: 'CCTV camera installation', itHardwareLikelihood: 'HIGH' },
    { name: 'Desktop & Server Maintenance Firms', searchKeyword: 'Computer maintenance AMC', itHardwareLikelihood: 'HIGH' },
  ],

  // 5. Professional Offices, Chartered Accountants & Legal Services Expansion
  offices: [
    { name: 'Chartered Accountants & Auditors', searchKeyword: 'Chartered Accountant', itHardwareLikelihood: 'HIGH' },
    { name: 'Auditors & Tax Consultants', searchKeyword: 'Auditor CA firm', itHardwareLikelihood: 'HIGH' },
    { name: 'Tax Consultants & GST Practitioners', searchKeyword: 'Tax consultant GST office', itHardwareLikelihood: 'HIGH' },
    { name: 'Law Firms & Advocates', searchKeyword: 'Advocate lawyer office', itHardwareLikelihood: 'HIGH' },
    { name: 'Company Secretaries & Corporate Advisors', searchKeyword: 'Company secretary CS firm', itHardwareLikelihood: 'HIGH' },
    { name: 'Accounting & Bookkeeping Firms', searchKeyword: 'Accounting bookkeeping firm', itHardwareLikelihood: 'HIGH' },
    { name: 'Logistics & Courier Services', searchKeyword: 'Courier logistics office', itHardwareLikelihood: 'HIGH' },
    { name: 'Financial Consultancies & Loan Services', searchKeyword: 'Finance consultancy office', itHardwareLikelihood: 'HIGH' },
    { name: 'Real Estate & Builders', searchKeyword: 'Real estate builder office', itHardwareLikelihood: 'HIGH' },
    { name: 'Architects & Civil Engineers', searchKeyword: 'Architect civil engineer office', itHardwareLikelihood: 'HIGH' },
  ],
};

/**
 * Expands a given input category string into relevant, focused subcategories.
 */
export function expandCategory(rawCategory: string, maxSubcategories = 12): SubcategoryMeta[] {
  const norm = (rawCategory || '').toLowerCase().trim();

  // Match IT / Web / Computer Repair first to avoid falling into generic retail "shop"
  if (
    norm.includes('computer') ||
    norm.includes('laptop') ||
    norm.includes('repair') ||
    norm.includes('web') ||
    norm.includes('website') ||
    norm.includes('software') ||
    norm.includes('network') ||
    norm.includes('amc') ||
    norm.includes('cctv') ||
    norm.includes('it support') ||
    norm.includes('tech')
  ) {
    return TAXONOMY_MAP.it_services.slice(0, maxSubcategories);
  }

  // Match Professional Offices, CA, Tax, Accounts, Law
  if (
    norm.includes('account') ||
    norm.includes('ca ') ||
    norm.includes('chartered') ||
    norm.includes('auditor') ||
    norm.includes('audit') ||
    norm.includes('tax') ||
    norm.includes('gst') ||
    norm.includes('law') ||
    norm.includes('advocate') ||
    norm.includes('legal') ||
    norm.includes('office') ||
    norm.includes('consultant')
  ) {
    return TAXONOMY_MAP.offices.slice(0, maxSubcategories);
  }

  // Match Clinics / Healthcare
  if (
    norm.includes('clinic') ||
    norm.includes('hospital') ||
    norm.includes('doctor') ||
    norm.includes('health') ||
    norm.includes('medical') ||
    norm.includes('dental') ||
    norm.includes('pharmacy')
  ) {
    return TAXONOMY_MAP.clinics.slice(0, maxSubcategories);
  }

  // Match Education
  if (
    norm.includes('school') ||
    norm.includes('college') ||
    norm.includes('education') ||
    norm.includes('academy') ||
    norm.includes('tuition') ||
    norm.includes('coaching') ||
    norm.includes('institute')
  ) {
    return TAXONOMY_MAP.education.slice(0, maxSubcategories);
  }

  // Match Retail
  if (
    norm.includes('retail') ||
    norm.includes('shop') ||
    norm.includes('store') ||
    norm.includes('market') ||
    norm.includes('commercial') ||
    norm.includes('hardware') ||
    norm === 'businesses'
  ) {
    return TAXONOMY_MAP.retail.slice(0, maxSubcategories);
  }

  // Fallback: If specific subcategory passed, return it with high likelihood
  return [
    { name: rawCategory, searchKeyword: rawCategory, itHardwareLikelihood: 'HIGH' },
  ];
}

