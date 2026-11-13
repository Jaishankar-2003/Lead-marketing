export const CONFIG = {
  // Browser settings
  headless: false,   // Headed browser helps bypass search engine bot blocks
  slowMo: 40,        // Human-like action delay

  // Scraping depth
  pagesPerSource: 2, // Balanced for speed and quality
  delayBetweenRequests: { min: 1500, max: 3500 }, // ms
  pageLoadTimeout: 25000,
  navigationTimeout: 20000,

  // Website analyzer settings
  websiteAuditTimeout: 12000, // Max ms to spend inspecting an external business site
  analyzerConcurrency: 3,     // Concurrent website analysis workers

  // Lead qualification thresholds
  scoring: {
    highThreshold: 70,
    mediumThreshold: 40,
  },

  // Output paths
  outputDir: 'output',
  allLeadsCsv: 'all_leads.csv',
  allLeadsJson: 'all_leads.json',
  qualifiedLeadsCsv: 'qualified_leads.csv',
  qualifiedLeadsJson: 'qualified_leads.json',
  txtFileName: 'websites.txt',

  // Directory aggregators, search engines, and portal domains to exclude
  excludedDomains: [
    // Search engines & big tech
    'google.com', 'google.co.in', 'bing.com', 'duckduckgo.com', 'yahoo.com',
    'microsoft.com', 'apple.com', 'msn.com', 'baidu.com', 'yandex.com',

    // Social media & video platforms
    'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com',
    'youtube.com', 'pinterest.com', 'tumblr.com', 'reddit.com', 'quora.com',
    'wikipedia.org', 'tiktok.com', 't.me', 'telegram.org', 'whatsapp.com',

    // Major business directories & aggregators (India & Global)
    'justdial.com', 'sulekha.com', 'indiamart.com', 'tradeindia.com',
    'yellowpages.in', 'yellowpages.com', 'indianyellowpages.com', 'useityellowpages.com',
    'yellowpages.webindia123.com', 'asklaila.com', 'bizdir24.com', 'bdir.in',
    'cybo.com', 'starofservice.in', 'threebestrated.in', 'threebestrated.com',
    'datagemba.com', 'promanage.biz', 'nehruplacemarket.com', 'indiaonline.in',
    'livechennai.com', 'clickedindia.net', 'quikr.com', 'olx.in', 'olx.com',
    'mouthshut.com', 'trustpilot.com', 'sitejabber.com', 'complaintsboard.com',
    'exportersindia.com', 'dir.indiamart.com', 'magicpin.in', 'locanto.net',
    'yalwa.in', 'click.in', 'vocal.in', 'nearme.in', 'maduraionline.in',
    'tamilnaduyellowpages.com', 'dialme.in', 'addressguru.in', 'infoisinfo.co.in',

    // Tech media, blogs, review portals
    'gadgets360.com', 'brandveda.in', 'rankexdigital.com', 'dotcominfoway.com',
    'medium.com', 'github.com', 'wordpress.com', 'blogspot.com', 'wixsite.com',

    // E-commerce & booking marketplaces
    'amazon.in', 'amazon.com', 'flipkart.com', 'snapdeal.com', 'shopclues.com',
    'reliancedigitalstores.in', 'store.reliancedigital.in', 'croma.com',
    'zomato.com', 'swiggy.com', 'makemytrip.com', 'booking.com', 'airbnb.com',
    'tripadvisor.com', 'naukri.com', 'glassdoor.com', 'indeed.com',
  ],

  // Common public Indian top-level domains for strict validation
  validTlds: [
    'com', 'in', 'co.in', 'org', 'net', 'info', 'biz', 'io', 'tech', 'store',
    'online', 'site', 'edu', 'ac.in', 'org.in', 'gen.in', 'firm.in', 'ind.in',
    'dev', 'app', 'pro', 'agency', 'digital', 'solutions', 'services', 'co'
  ],
};
