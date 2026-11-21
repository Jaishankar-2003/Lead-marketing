export interface ParsedComponentItem {
  componentName: string;
  brand: string;
  model: string;
  specifications: string;
  quantity: number;
  onlinePrice?: number;
  categoryId?: string;
  detectedCategoryName?: string;
}

const COMMON_BRANDS = [
  'AMD', 'Intel', 'NVIDIA', 'Asus', 'ASUS', 'MSI', 'Gigabyte', 'Zotac', 'Galax',
  'Corsair', 'Crucial', 'Kingston', 'G.Skill', 'Adata', 'XPG', 'TeamGroup',
  'Samsung', 'Western Digital', 'WD', 'Seagate', 'Kingston', 'Crucial',
  'DeepCool', 'Cooler Master', 'NZXT', 'Lian Li', 'Ant Esports', 'Antec',
  'Corsair', 'Seasonic', 'SilverStone', 'MSI', 'Circle', 'Zebronics',
  'LG', 'Dell', 'HP', 'BenQ', 'Acer', 'ViewSonic', 'Samsung', 'AOC',
  'Logitech', 'Razer', 'Redragon', 'Cosmic Byte', 'Keychron',
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'processors-cpu': ['processor', 'cpu', 'ryzen', 'intel core', 'core i3', 'core i5', 'core i7', 'core i9', 'threadripper', 'xeon', 'pentium'],
  'graphics-cards-gpu': ['graphics card', 'graphic card', 'gpu', 'video card', 'rtx', 'gtx', 'geforce', 'radeon', 'rx 6', 'rx 7', 'quadro', 'arc a'],
  'motherboards': ['motherboard', 'mainboard', 'mobo', 'b650', 'b760', 'z790', 'x670', 'b550', 'b450', 'h610', 'a620', 'x570', 'h510', 'lga1700', 'am5', 'am4'],
  'ram-memory': ['ram', 'memory', 'ddr4', 'ddr5', 'ddr3', 'sodimm', 'dimm', '6000mhz', '5600mhz', '5200mhz', '3200mhz', '2666mhz'],
  'storage-ssd-hdd': ['storage', 'ssd', 'hdd', 'hard disk', 'nvme', 'm.2', 'pcie gen', 'sata ssd', 'barracuda', 'ironwolf', 'surveillance hdd'],
  'power-supply-smps': ['power supply', 'psu', 'smps', '80+', '80 plus', 'gold', 'bronze', 'atx 3.0', 'atx 3.1', 'watt', '750w', '850w', '650w', '550w', '1000w'],
  'cabinets-cases': ['cabinet', 'case', 'chassis', 'mid-tower', 'mini-itx', 'full-tower', 'airflow mesh', 'tempered glass'],
  'cooling-fans': ['cooler', 'cooling', 'aio', 'liquid cooler', 'air cooler', 'cpu cooler', 'radiator', 'argb fans', 'case fan'],
  'monitors-displays': ['monitor', 'display', 'screen', 'gaming monitor', 'ips panel', '144hz', '165hz', '240hz', '2k', '4k', 'fhd'],
  'peripherals-keyboards-mouse': ['keyboard', 'mouse', 'headset', 'headphones', 'mousepad', 'combo'],
  'laptop-spares': ['laptop screen', 'laptop battery', 'laptop keyboard', 'laptop charger', 'laptop adapter'],
  'networking-cables': ['router', 'switch', 'lan cable', 'cat6', 'wifi adapter', 'ethernet'],
};

/**
 * Parses freeform text (like numbered lists, quotation sheets, or WhatsApp specs)
 * into structured component enquiry items.
 */
export function parseComponentListText(
  rawText: string,
  availableCategories: Array<{ id: string; name: string; slug?: string }> = []
): ParsedComponentItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const items: ParsedComponentItem[] = [];

  for (const line of lines) {
    // Skip general headers or notes (e.g. "Looking for components only", "Hi bro urgent requirement", "Please share best rates")
    const lowerLine = line.toLowerCase();
    if (
      lowerLine.startsWith('hi ') ||
      lowerLine.startsWith('hello ') ||
      lowerLine.startsWith('dear ') ||
      lowerLine.startsWith('please ') ||
      lowerLine.startsWith('looking for ') ||
      lowerLine.startsWith('thanks') ||
      lowerLine.startsWith('regards') ||
      lowerLine.startsWith('requirement') ||
      lowerLine.includes('following pc components') ||
      lowerLine.includes('no assembly')
    ) {
      continue;
    }

    // Strip leading list numbers: "1.", "1)", "[1]", "-", "*", "•"
    let cleanLine = line.replace(/^(?:(?:\d+[\.\)\-\:]\s*)|(?:[\-\*•\>\#]\s*))/, '').trim();
    if (!cleanLine) continue;

    let roleOrType = '';
    let details = cleanLine;

    // Check for "Component Type: Details" pattern
    // e.g. "Processor: AMD Ryzen 7 9700X (8 Cores / 16 Threads)"
    const colonIdx = cleanLine.indexOf(':');
    if (colonIdx > 0 && colonIdx < 35) {
      roleOrType = cleanLine.slice(0, colonIdx).trim();
      details = cleanLine.slice(colonIdx + 1).trim();
    }

    // Detect quantity: look for "Qty: 2", "2 Nos", "2x", "x 2", "(2 x 32GB)"
    let quantity = 1;
    const qtyMatch = details.match(/(?:qty\s*[:\-\=]?\s*(\d+))|(?:(\d+)\s*(?:nos|pcs|units|x\b))/i);
    if (qtyMatch) {
      const qVal = parseInt(qtyMatch[1] || qtyMatch[2], 10);
      if (!isNaN(qVal) && qVal > 0) quantity = qVal;
    }

    // Detect online price: look for "₹45,000", "Rs 45000", "Rs.45000"
    let onlinePrice: number | undefined;
    const priceMatch = details.match(/(?:(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?))/i);
    if (priceMatch) {
      const rawPrice = priceMatch[1].replace(/,/g, '');
      const parsedPrice = parseFloat(rawPrice);
      if (!isNaN(parsedPrice) && parsedPrice > 0) {
        onlinePrice = parsedPrice;
      }
    }

    // Detect brand
    let detectedBrand = '';
    for (const b of COMMON_BRANDS) {
      const bRegex = new RegExp(`\\b${b}\\b`, 'i');
      if (bRegex.test(details) || bRegex.test(roleOrType)) {
        detectedBrand = b;
        break;
      }
    }

    // Detect specifications in parentheses, e.g. "(8 Cores / 16 Threads)" or "(2 × 32GB)"
    let specifications = '';
    const specMatch = details.match(/\(([^)]+)\)/);
    if (specMatch) {
      specifications = specMatch[1].trim();
    }

    // Find best category match
    let matchedCatId: string | undefined;
    let matchedCatName: string | undefined;

    const fullSearchText = `${roleOrType} ${details}`.toLowerCase();

    for (const [catKey, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const isMatch = keywords.some((kw) => fullSearchText.includes(kw));
      if (isMatch) {
        // Find in availableCategories
        const found = availableCategories.find((c) => {
          const cNameLower = c.name.toLowerCase();
          return keywords.some((kw) => cNameLower.includes(kw));
        });
        if (found) {
          matchedCatId = found.id;
          matchedCatName = found.name;
          break;
        }
      }
    }

    // Component name cleanup: remove parenthesized specs from the title
    let componentName = details.replace(/\([^)]+\)/g, '').trim();
    // If roleOrType exists and isn't already in details, prepend or use as context
    if (roleOrType && !componentName.toLowerCase().includes(roleOrType.toLowerCase())) {
      // e.g. Processor -> AMD Ryzen 7 9700X
      // Keep componentName clean
    }

    // Remove any trailing commas or hyphens
    componentName = componentName.replace(/[,\-;]+$/, '').trim();

    if (componentName.length > 2) {
      items.push({
        componentName,
        brand: detectedBrand,
        model: '',
        specifications,
        quantity,
        onlinePrice,
        categoryId: matchedCatId,
        detectedCategoryName: matchedCatName,
      });
    }
  }

  return items;
}
