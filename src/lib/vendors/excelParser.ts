import * as XLSX from 'xlsx';
import { extractPhoneNumbers, normalizeIndianPhone } from './phoneUtils';

export interface ExtractedVendorRow {
  rowNumber: number;
  sectionIndex: number;
  sectionTitle?: string;
  sourceSheet: string;
  name: string;
  phoneRaw: string;
  normalizedPhones: Array<{
    normalized: string;
    nationalFormat: string;
    type: 'MOBILE' | 'LANDLINE' | 'TOLL_FREE' | 'UNKNOWN';
    canWhatsApp: boolean;
  }>;
  email?: string;
  contactPerson?: string;
  address?: string;
  city?: string;
  state?: string;
  district?: string;
  areaMarket?: string;
  categories: string[];
  notes?: string;
  gstNumber?: string;
  rawRecord: Record<string, any>;
  hasWarning: boolean;
  warningMessage?: string;
}

export interface DetectedSection {
  index: number;
  title?: string;
  detectedLocation?: {
    city?: string;
    state?: string;
    areaMarket?: string;
  };
  startCol: number;
  endCol: number;
  headerRow: number;
  headers: Record<number, string>; // colIndex -> headerName
  fieldMapping: Record<string, number>; // fieldKey -> colIndex
  rowCount: number;
}

export interface ExcelParseResult {
  sheetNames: string[];
  activeSheet: string;
  detectedLayout: 'STANDARD_TABLE' | 'HORIZONTAL_MULTI_SECTION' | 'VERTICAL_STACKED_SECTIONS';
  sections: DetectedSection[];
  rows: ExtractedVendorRow[];
  totalRows: number;
  validRows: number;
  warningRows: number;
  uniquePhoneCount: number;
}

const HEADER_SYNONYMS: Record<string, string[]> = {
  name: [
    'vendor', 'shop', 'dealer', 'business', 'company', 'firm', 'store', 'name',
    'shop name', 'vendor name', 'company name', 'dealer name', 'business name',
    'firm name', 'party name', 'party', 'supplier', 'trader', 'outlet'
  ],
  phone: [
    'phone', 'mobile', 'contact', 'cell', 'tel', 'whatsapp', 'phone number',
    'mobile no', 'mobile number', 'contact no', 'contact number', 'ph no', 'ph',
    'contact details', 'calling no', 'wa no', 'telephone', 'tele'
  ],
  address: [
    'address', 'shop address', 'location', 'street', 'locality', 'shop no',
    'premise', 'complex', 'building', 'market address', 'full address', 'addr'
  ],
  city: ['city', 'town', 'district', 'place', 'station', 'location city'],
  state: ['state', 'province', 'region'],
  areaMarket: [
    'area', 'market', 'commercial market', 'sub-area', 'locality', 'street name',
    'bazaar', 'center', 'hub', 'landmark'
  ],
  category: [
    'category', 'products', 'deals in', 'items', 'dealing in', 'specialization',
    'components', 'brand', 'brands', 'materials', 'type', 'service', 'services'
  ],
  contactPerson: [
    'contact person', 'owner', 'proprietor', 'manager', 'person', 'contact name',
    'prop', 'authorized person', 'rep'
  ],
  email: ['email', 'e-mail', 'mail', 'email id', 'mail id'],
  gstNumber: ['gst', 'gstin', 'gst no', 'gst number', 'tax id', 'tin'],
  notes: ['notes', 'remarks', 'remark', 'comments', 'comment', 'description']
};

/**
 * Normalizes header string to match synonyms.
 */
function matchFieldRole(rawHeader: string): string | null {
  if (!rawHeader) return null;
  const cleaned = rawHeader.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  for (const [field, synonyms] of Object.entries(HEADER_SYNONYMS)) {
    for (const syn of synonyms) {
      const synCleaned = syn.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleaned === synCleaned || cleaned.includes(synCleaned) || synCleaned.includes(cleaned)) {
        return field;
      }
    }
  }
  return null;
}

/**
 * Extracts geographical hints from text (e.g. "Madurai - Simmakkal" or "SP Road, Bangalore").
 */
function extractGeoHints(text: string): { city?: string; state?: string; areaMarket?: string } {
  const result: { city?: string; state?: string; areaMarket?: string } = {};
  if (!text) return result;
  const lower = text.toLowerCase();

  const cities: Record<string, { city: string; state: string }> = {
    'madurai': { city: 'Madurai', state: 'Tamil Nadu' },
    'chennai': { city: 'Chennai', state: 'Tamil Nadu' },
    'coimbatore': { city: 'Coimbatore', state: 'Tamil Nadu' },
    'tiruppur': { city: 'Tiruppur', state: 'Tamil Nadu' },
    'tirupur': { city: 'Tiruppur', state: 'Tamil Nadu' },
    'salem': { city: 'Salem', state: 'Tamil Nadu' },
    'trichy': { city: 'Tiruchirappalli', state: 'Tamil Nadu' },
    'tiruchirappalli': { city: 'Tiruchirappalli', state: 'Tamil Nadu' },
    'bangalore': { city: 'Bangalore', state: 'Karnataka' },
    'bengaluru': { city: 'Bangalore', state: 'Karnataka' },
    'delhi': { city: 'Delhi', state: 'Delhi' },
    'new delhi': { city: 'Delhi', state: 'Delhi' },
    'mumbai': { city: 'Mumbai', state: 'Maharashtra' },
    'pune': { city: 'Pune', state: 'Maharashtra' },
    'hyderabad': { city: 'Hyderabad', state: 'Telangana' },
    'secunderabad': { city: 'Hyderabad', state: 'Telangana' },
  };

  const areas: Record<string, { area: string; city: string; state: string }> = {
    'gandhipuram': { area: 'Gandhipuram', city: 'Coimbatore', state: 'Tamil Nadu' },
    'cross cut': { area: 'Cross Cut Road', city: 'Coimbatore', state: 'Tamil Nadu' },
    'rs puram': { area: 'RS Puram', city: 'Coimbatore', state: 'Tamil Nadu' },
    'sp road': { area: 'SP Road', city: 'Bangalore', state: 'Karnataka' },
    's.p. road': { area: 'SP Road', city: 'Bangalore', state: 'Karnataka' },
    'nehru place': { area: 'Nehru Place', city: 'Delhi', state: 'Delhi' },
    'ritchie street': { area: 'Ritchie Street', city: 'Chennai', state: 'Tamil Nadu' },
    'mount road': { area: 'Mount Road', city: 'Chennai', state: 'Tamil Nadu' },
    'lamington road': { area: 'Lamington Road', city: 'Mumbai', state: 'Maharashtra' },
    'goripalayam': { area: 'Goripalayam', city: 'Madurai', state: 'Tamil Nadu' },
    'simmakkal': { area: 'Simmakkal', city: 'Madurai', state: 'Tamil Nadu' },
    'anna nagar': { area: 'Anna Nagar', city: 'Madurai', state: 'Tamil Nadu' },
    'ctc': { area: 'CTC Parklane', city: 'Hyderabad', state: 'Telangana' },
  };

  for (const [areaKey, info] of Object.entries(areas)) {
    if (lower.includes(areaKey)) {
      result.areaMarket = info.area;
      result.city = info.city;
      result.state = info.state;
      return result;
    }
  }

  for (const [cityKey, info] of Object.entries(cities)) {
    if (lower.includes(cityKey)) {
      result.city = info.city;
      result.state = info.state;
      break;
    }
  }

  return result;
}

/**
 * Parses an Excel or CSV file buffer and auto-detects multi-column horizontal sections
 * or standard structures.
 */
export function parseVendorSpreadsheet(
  fileBuffer: Buffer,
  sheetNamePreference?: string
): ExcelParseResult {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true, raw: false });
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('Spreadsheet does not contain any readable sheets.');
  }

  const activeSheetName = (sheetNamePreference && sheetNames.includes(sheetNamePreference))
    ? sheetNamePreference
    : sheetNames[0];

  const worksheet = workbook.Sheets[activeSheetName];
  if (!worksheet) {
    throw new Error(`Sheet "${activeSheetName}" could not be read.`);
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawRows || rawRows.length === 0) {
    return {
      sheetNames,
      activeSheet: activeSheetName,
      detectedLayout: 'STANDARD_TABLE',
      sections: [],
      rows: [],
      totalRows: 0,
      validRows: 0,
      warningRows: 0,
      uniquePhoneCount: 0,
    };
  }

  // Find max columns
  let maxCols = 0;
  for (const r of rawRows) {
    if (r.length > maxCols) maxCols = r.length;
  }

  // 1. Detect if sheet has horizontal multi-sections (e.g. Cols 0-3 = Section 1, Cols 5-8 = Section 2)
  // Check the first 5 rows for column clusters separated by empty columns
  const sections: DetectedSection[] = detectHorizontalSections(rawRows, maxCols);

  let layout: 'STANDARD_TABLE' | 'HORIZONTAL_MULTI_SECTION' | 'VERTICAL_STACKED_SECTIONS' = 'STANDARD_TABLE';
  if (sections.length > 1) {
    layout = 'HORIZONTAL_MULTI_SECTION';
  }

  const extractedRows: ExtractedVendorRow[] = [];
  const seenPhones = new Set<string>();

  for (const sec of sections) {
    const dataStartRow = sec.headerRow + 1;
    let secRowCount = 0;

    for (let rIdx = dataStartRow; rIdx < rawRows.length; rIdx++) {
      const row = rawRows[rIdx];
      if (!row) continue;

      // Extract raw cell values for this section
      const rawRecord: Record<string, any> = {};
      let hasAnyValue = false;

      for (let c = sec.startCol; c <= sec.endCol; c++) {
        const val = row[c] != null ? String(row[c]).trim() : '';
        const hName = sec.headers[c] || `Col_${c}`;
        rawRecord[hName] = val;
        if (val) hasAnyValue = true;
      }

      if (!hasAnyValue) continue;

      // Map to vendor fields
      const getName = () => {
        const col = sec.fieldMapping['name'];
        if (col !== undefined && row[col]) return String(row[col]).trim();
        // Fallback: first non-empty text column
        for (let c = sec.startCol; c <= sec.endCol; c++) {
          const v = row[c] != null ? String(row[c]).trim() : '';
          if (v && isNaN(Number(v)) && !v.includes('@') && v.length > 2) return v;
        }
        return '';
      };

      const getPhoneRaw = () => {
        const col = sec.fieldMapping['phone'];
        if (col !== undefined && row[col]) return String(row[col]).trim();
        // Fallback: search row cells for digits
        for (let c = sec.startCol; c <= sec.endCol; c++) {
          const v = row[c] != null ? String(row[c]).trim() : '';
          const digits = v.replace(/\D/g, '');
          if (digits.length >= 7 && digits.length <= 13) return v;
        }
        return '';
      };

      const getVal = (field: string) => {
        const col = sec.fieldMapping[field];
        if (col !== undefined && row[col] != null) {
          return String(row[col]).trim();
        }
        return undefined;
      };

      const name = getName();
      const phoneRaw = getPhoneRaw();
      const address = getVal('address');
      let city = getVal('city') || sec.detectedLocation?.city;
      let state = getVal('state') || sec.detectedLocation?.state;
      let areaMarket = getVal('areaMarket') || sec.detectedLocation?.areaMarket;
      const contactPerson = getVal('contactPerson');
      const email = getVal('email');
      const gstNumber = getVal('gstNumber');
      const notes = getVal('notes');
      const categoryRaw = getVal('category');

      // Check if address holds geographical context
      if (address) {
        const addrGeo = extractGeoHints(address);
        if (!city && addrGeo.city) city = addrGeo.city;
        if (!state && addrGeo.state) state = addrGeo.state;
        if (!areaMarket && addrGeo.areaMarket) areaMarket = addrGeo.areaMarket;
      }

      // Check section title for geo hints
      if (sec.title) {
        const titleGeo = extractGeoHints(sec.title);
        if (!city && titleGeo.city) city = titleGeo.city;
        if (!state && titleGeo.state) state = titleGeo.state;
        if (!areaMarket && titleGeo.areaMarket) areaMarket = titleGeo.areaMarket;
      }

      // Parse phones
      const phoneCandidates = extractPhoneNumbers(phoneRaw);
      const normalizedPhones = phoneCandidates.map(p => {
        const res = normalizeIndianPhone(p);
        if (res.cleanDigits) {
          seenPhones.add(res.cleanDigits);
        }
        return {
          normalized: res.normalized,
          nationalFormat: res.nationalFormat,
          type: res.type,
          canWhatsApp: res.canWhatsApp,
        };
      });

      // Parse categories
      const categories: string[] = [];
      if (categoryRaw) {
        const splits = categoryRaw.split(/[,;\/\n|]/);
        for (const s of splits) {
          const cleanCat = s.trim();
          if (cleanCat && cleanCat.length > 1) {
            categories.push(cleanCat);
          }
        }
      }

      // Validate row
      let hasWarning = false;
      const warnings: string[] = [];

      if (!name) {
        hasWarning = true;
        warnings.push('Missing vendor name.');
      }
      if (!phoneRaw || normalizedPhones.length === 0) {
        hasWarning = true;
        warnings.push('No phone number found.');
      } else if (!normalizedPhones.some(p => p.normalized)) {
        hasWarning = true;
        warnings.push('Invalid phone format.');
      }

      extractedRows.push({
        rowNumber: rIdx + 1,
        sectionIndex: sec.index,
        sectionTitle: sec.title,
        sourceSheet: activeSheetName,
        name: name || `Unnamed Vendor (Row ${rIdx + 1})`,
        phoneRaw,
        normalizedPhones,
        email,
        contactPerson,
        address,
        city,
        state,
        areaMarket,
        categories,
        notes,
        gstNumber,
        rawRecord,
        hasWarning,
        warningMessage: warnings.length > 0 ? warnings.join(' ') : undefined,
      });

      secRowCount++;
    }

    sec.rowCount = secRowCount;
  }

  const validRows = extractedRows.filter(r => !r.hasWarning).length;
  const warningRows = extractedRows.length - validRows;

  return {
    sheetNames,
    activeSheet: activeSheetName,
    detectedLayout: layout,
    sections,
    rows: extractedRows,
    totalRows: extractedRows.length,
    validRows,
    warningRows,
    uniquePhoneCount: seenPhones.size,
  };
}

/**
 * Detects column clusters for horizontal multi-section layouts.
 */
function detectHorizontalSections(rawRows: any[][], maxCols: number): DetectedSection[] {
  // Inspect rows 0 to 4 for headers
  const sampleRowCount = Math.min(6, rawRows.length);

  // Score each cell for likelihood of being a header
  let bestHeaderRow = 0;
  let maxHeaderMatches = 0;

  for (let r = 0; r < sampleRowCount; r++) {
    const row = rawRows[r] || [];
    let matches = 0;
    for (const cell of row) {
      if (typeof cell === 'string' && matchFieldRole(cell)) {
        matches++;
      }
    }
    if (matches > maxHeaderMatches) {
      maxHeaderMatches = matches;
      bestHeaderRow = r;
    }
  }

  const headerRow = rawRows[bestHeaderRow] || [];

  // Group columns into contiguous non-empty spans separated by empty columns
  const spans: Array<{ startCol: number; endCol: number; headers: Record<number, string> }> = [];
  let currentSpan: { startCol: number; endCol: number; headers: Record<number, string> } | null = null;

  for (let c = 0; c < maxCols; c++) {
    const headerVal = headerRow[c] != null ? String(headerRow[c]).trim() : '';

    // Check if entire column is empty in sample rows
    let colHasData = false;
    for (let r = bestHeaderRow; r < Math.min(rawRows.length, bestHeaderRow + 10); r++) {
      if (rawRows[r] && rawRows[r][c] != null && String(rawRows[r][c]).trim()) {
        colHasData = true;
        break;
      }
    }

    if (colHasData || headerVal) {
      if (!currentSpan) {
        currentSpan = { startCol: c, endCol: c, headers: {} };
      }
      currentSpan.endCol = c;
      if (headerVal) {
        currentSpan.headers[c] = headerVal;
      }
    } else {
      if (currentSpan) {
        spans.push(currentSpan);
        currentSpan = null;
      }
    }
  }
  if (currentSpan) {
    spans.push(currentSpan);
  }

  // If only 1 span or no spans found, treat the whole row range as 1 section
  if (spans.length === 0) {
    spans.push({ startCol: 0, endCol: Math.max(0, maxCols - 1), headers: {} });
  }

  const sections: DetectedSection[] = spans.map((span, idx) => {
    // Check if row above header has a section title (e.g. "MADURAI - SIMMAKKAL")
    let title: string | undefined;
    if (bestHeaderRow > 0) {
      for (let c = span.startCol; c <= span.endCol; c++) {
        const valAbove = rawRows[bestHeaderRow - 1]?.[c];
        if (valAbove && typeof valAbove === 'string' && valAbove.trim().length > 2) {
          title = valAbove.trim();
          break;
        }
      }
    }

    // If still no title and first row has a banner spanning across
    if (!title && rawRows[0]) {
      const topBanner = rawRows[0][span.startCol];
      if (topBanner && typeof topBanner === 'string' && topBanner.trim().length > 2) {
        title = topBanner.trim();
      }
    }

    const fieldMapping: Record<string, number> = {};
    for (const [colStr, hName] of Object.entries(span.headers)) {
      const colIdx = Number(colStr);
      const role = matchFieldRole(hName);
      if (role && fieldMapping[role] === undefined) {
        fieldMapping[role] = colIdx;
      }
    }

    const detectedLocation = title ? extractGeoHints(title) : undefined;

    return {
      index: idx,
      title,
      detectedLocation,
      startCol: span.startCol,
      endCol: span.endCol,
      headerRow: bestHeaderRow,
      headers: span.headers,
      fieldMapping,
      rowCount: 0,
    };
  });

  return sections;
}
