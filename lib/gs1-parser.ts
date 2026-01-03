/**
 * GS1 Digital Link Parser
 * 
 * Parses GS1 Digital Link URLs to extract:
 * - GTIN (Global Trade Item Number)
 * - Expiry Date
 * - Batch/Lot Number
 * - Serial Number (if present)
 * 
 * Example URL: https://eco.link/01/09506000134352/17/260530/10/BATCH_A1
 * 
 * Application Identifiers (AI):
 * - 01: GTIN
 * - 17: Expiry Date (YYMMDD)
 * - 10: Batch/Lot Number
 * - 21: Serial Number
 */

export interface GS1ParsedData {
  gtin: string;
  expiryDate: Date | null;
  expiryDateRaw: string | null;
  batchNumber: string | null;
  serialNumber: string | null;
  rawUrl: string;
  isValid: boolean;
  errors: string[];
}

// GS1 Application Identifier patterns
const AI_PATTERNS = {
  GTIN: /\/01\/(\d{8,14})/,
  EXPIRY: /\/17\/(\d{6})/,
  BATCH: /\/10\/([^\/]+)/,
  SERIAL: /\/21\/([^\/]+)/,
};

/**
 * Parse a GS1 Digital Link URL
 */
export function parseGS1DigitalLink(url: string): GS1ParsedData {
  const result: GS1ParsedData = {
    gtin: '',
    expiryDate: null,
    expiryDateRaw: null,
    batchNumber: null,
    serialNumber: null,
    rawUrl: url,
    isValid: false,
    errors: [],
  };

  try {
    // Decode URL in case it's URL-encoded
    const decodedUrl = decodeURIComponent(url);

    // Extract GTIN (required)
    const gtinMatch = decodedUrl.match(AI_PATTERNS.GTIN);
    if (gtinMatch) {
      result.gtin = gtinMatch[1];
    } else {
      result.errors.push('Missing or invalid GTIN (AI 01)');
    }

    // Extract Expiry Date (YYMMDD format)
    const expiryMatch = decodedUrl.match(AI_PATTERNS.EXPIRY);
    if (expiryMatch) {
      result.expiryDateRaw = expiryMatch[1];
      result.expiryDate = parseGS1Date(expiryMatch[1]);
      if (!result.expiryDate) {
        result.errors.push('Invalid expiry date format');
      }
    }

    // Extract Batch Number
    const batchMatch = decodedUrl.match(AI_PATTERNS.BATCH);
    if (batchMatch) {
      result.batchNumber = batchMatch[1];
    }

    // Extract Serial Number
    const serialMatch = decodedUrl.match(AI_PATTERNS.SERIAL);
    if (serialMatch) {
      result.serialNumber = serialMatch[1];
    }

    // Validation
    result.isValid = result.gtin !== '' && result.errors.length === 0;

  } catch (error) {
    result.errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Parse GS1 date format (YYMMDD)
 * Handles century rollover: 00-49 = 2000s, 50-99 = 1900s
 */
function parseGS1Date(dateStr: string): Date | null {
  if (dateStr.length !== 6) return null;

  const year = parseInt(dateStr.substring(0, 2), 10);
  const month = parseInt(dateStr.substring(2, 4), 10);
  const day = parseInt(dateStr.substring(4, 6), 10);

  // Validate ranges
  if (month < 1 || month > 12) return null;
  if (day < 0 || day > 31) return null;

  // Century determination (00-49 = 2000s, 50-99 = 1900s)
  const fullYear = year >= 50 ? 1900 + year : 2000 + year;

  // Day 00 means end of month
  const actualDay = day === 0 ? new Date(fullYear, month, 0).getDate() : day;

  return new Date(fullYear, month - 1, actualDay);
}

/**
 * Generate a GS1 Digital Link URL
 */
export function generateGS1DigitalLink(params: {
  baseUrl: string;
  gtin: string;
  expiryDate?: Date;
  batchNumber?: string;
  serialNumber?: string;
}): string {
  let url = `${params.baseUrl}/01/${params.gtin}`;

  if (params.expiryDate) {
    const yy = String(params.expiryDate.getFullYear()).slice(-2);
    const mm = String(params.expiryDate.getMonth() + 1).padStart(2, '0');
    const dd = String(params.expiryDate.getDate()).padStart(2, '0');
    url += `/17/${yy}${mm}${dd}`;
  }

  if (params.batchNumber) {
    url += `/10/${encodeURIComponent(params.batchNumber)}`;
  }

  if (params.serialNumber) {
    url += `/21/${encodeURIComponent(params.serialNumber)}`;
  }

  return url;
}

/**
 * Calculate days until expiry
 */
export function getDaysUntilExpiry(expiryDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get expiry status color based on days remaining
 */
export function getExpiryStatus(expiryDate: Date): {
  status: 'expired' | 'critical' | 'warning' | 'ok';
  color: string;
  label: string;
} {
  const days = getDaysUntilExpiry(expiryDate);

  if (days < 0) {
    return { status: 'expired', color: '#ef4444', label: 'Expired' };
  } else if (days <= 2) {
    return { status: 'critical', color: '#ef4444', label: 'Critical' };
  } else if (days <= 5) {
    return { status: 'warning', color: '#f59e0b', label: 'Near Expiry' };
  } else {
    return { status: 'ok', color: '#22c55e', label: 'Good' };
  }
}

/**
 * Validate GTIN checksum (Luhn algorithm variant)
 */
export function validateGTIN(gtin: string): boolean {
  if (!/^\d{8,14}$/.test(gtin)) return false;

  const digits = gtin.split('').map(Number);
  const checkDigit = digits.pop()!;
  
  let sum = 0;
  digits.reverse().forEach((digit, index) => {
    sum += digit * (index % 2 === 0 ? 3 : 1);
  });

  const calculatedCheck = (10 - (sum % 10)) % 10;
  return calculatedCheck === checkDigit;
}
