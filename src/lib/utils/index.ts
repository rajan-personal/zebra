/**
 * @fileoverview Utility functions for Zebra Scanner & Printer library
 * @module @zebra-app/utils
 * 
 * Common utilities used throughout the library:
 * - Device detection
 * - Barcode validation
 * - Unit conversion
 * - ZPL helpers
 */

// ============================================================================
// DEVICE DETECTION
// ============================================================================

/**
 * Known Zebra device manufacturers
 */
export const ZEBRA_MANUFACTURERS = [
  'Zebra',
  'Zebra Technologies',
  'Symbol',
  'Motorola Solutions',
  'Psion',
] as const;

/**
 * Check if the current device is a Zebra device
 * Works in both web and Capacitor environments
 */
export function isZebraDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check user agent
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for Zebra-specific identifiers
  if (userAgent.includes('zebra') || userAgent.includes('symbol')) {
    return true;
  }
  
  // Check device model if available (Cordova/Capacitor)
  const device = (window as unknown as { device?: { manufacturer?: string; model?: string } }).device;
  if (device?.manufacturer) {
    const manufacturer = device.manufacturer.toLowerCase();
    return ZEBRA_MANUFACTURERS.some(m => manufacturer.includes(m.toLowerCase()));
  }
  
  return false;
}

/**
 * Get device information
 */
export function getDeviceInfo(): {
  isZebra: boolean;
  manufacturer: string | null;
  model: string | null;
  platform: string;
} {
  if (typeof window === 'undefined') {
    return { isZebra: false, manufacturer: null, model: null, platform: 'server' };
  }
  
  const device = (window as unknown as { device?: { manufacturer?: string; model?: string; platform?: string } }).device;
  const userAgent = navigator.userAgent;
  
  let manufacturer: string | null = device?.manufacturer || null;
  let model: string | null = device?.model || null;
  
  // Try to extract from user agent
  if (!manufacturer) {
    if (userAgent.includes('Zebra')) manufacturer = 'Zebra';
    else if (userAgent.includes('Symbol')) manufacturer = 'Symbol';
    else if (userAgent.includes('Motorola')) manufacturer = 'Motorola';
  }
  
  return {
    isZebra: isZebraDevice(),
    manufacturer,
    model,
    platform: device?.platform || (typeof (window as unknown as { Capacitor?: unknown }).Capacitor !== 'undefined' ? 'capacitor' : 'web'),
  };
}

// ============================================================================
// BARCODE UTILITIES
// ============================================================================

/**
 * Barcode symbology patterns for validation
 */
export const BARCODE_PATTERNS: Record<string, RegExp> = {
  'EAN-13': /^\d{13}$/,
  'EAN-8': /^\d{8}$/,
  'UPC-A': /^\d{12}$/,
  'UPC-E': /^\d{6}$/,
  'CODE128': /^[\x20-\x7E]+$/, // Printable ASCII
  'CODE39': /^[A-Z0-9\-. $/+%]+$/,
  'CODE93': /^[A-Za-z0-9\-. $/+%]+$/,
  'QR': /.+/, // Any content
  'DATAMATRIX': /.+/, // Any content
};

/**
 * Validate barcode data against symbology
 */
export function validateBarcode(data: string, symbology: string): boolean {
  const pattern = BARCODE_PATTERNS[symbology.toUpperCase()];
  if (!pattern) return true; // Unknown symbology, accept
  return pattern.test(data);
}

/**
 * Detect barcode symbology from data
 */
export function detectSymbology(data: string): string {
  // Check for specific patterns
  if (/^\d{13}$/.test(data)) return 'EAN-13';
  if (/^\d{12}$/.test(data)) return 'UPC-A';
  if (/^\d{8}$/.test(data)) return 'EAN-8';
  if (/^[A-Z0-9\-. $/+%]+$/.test(data)) return 'CODE39';
  
  // Default to CODE128 for general alphanumeric
  if (/^[\x20-\x7E]+$/.test(data)) return 'CODE128';
  
  return 'UNKNOWN';
}

/**
 * Calculate EAN-13 check digit
 */
export function calculateEAN13CheckDigit(data: string): string {
  if (data.length !== 12 || !/^\d{12}$/.test(data)) {
    throw new Error('EAN-13 requires 12 digits');
  }
  
  const digits = data.split('').map(Number);
  const sum = digits.reduce((acc, digit, index) => {
    return acc + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

/**
 * Calculate UPC-A check digit (same as EAN-13)
 */
export const calculateUPCACheckDigit = calculateEAN13CheckDigit;

/**
 * Generate a random barcode for testing
 */
export function generateTestBarcode(symbology: string = 'CODE128'): string {
  switch (symbology.toUpperCase()) {
    case 'EAN-13': {
      const base = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
      return base + calculateEAN13CheckDigit(base);
    }
    case 'UPC-A': {
      const base = Math.floor(Math.random() * 100000000000).toString().padStart(11, '0');
      return base + calculateUPCACheckDigit(base);
    }
    case 'EAN-8':
      return Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    case 'CODE39':
      return 'TEST' + Math.random().toString(36).substring(2, 8).toUpperCase();
    case 'QR':
      return 'QR-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    default:
      return 'TEST' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}

// ============================================================================
// UNIT CONVERSION
// ============================================================================

/**
 * Convert millimeters to dots
 */
export function mmToDots(mm: number, density: number = 8): number {
  return Math.round(mm * density);
}

/**
 * Convert inches to dots
 */
export function inchesToDots(inches: number, density: number = 8): number {
  return Math.round(inches * density * 25.4);
}

/**
 * Convert dots to millimeters
 */
export function dotsToMm(dots: number, density: number = 8): number {
  return dots / density;
}

/**
 * Convert dots to inches
 */
export function dotsToInches(dots: number, density: number = 8): number {
  return dots / (density * 25.4);
}

/**
 * Common label sizes in mm
 */
export const LABEL_SIZES = {
  '2x1': { width: 50.8, height: 25.4 },  // 2" x 1"
  '3x1': { width: 76.2, height: 25.4 },  // 3" x 1"
  '4x2': { width: 101.6, height: 50.8 }, // 4" x 2"
  '4x3': { width: 101.6, height: 76.2 }, // 4" x 3"
  '4x6': { width: 101.6, height: 152.4 }, // 4" x 6" (shipping)
} as const;

/**
 * Common print densities (dots per mm)
 */
export const PRINT_DENSITIES = {
  '152-dpi': 6,
  '203-dpi': 8,  // Most common
  '300-dpi': 12,
  '600-dpi': 24,
} as const;

// ============================================================================
// ZPL UTILITIES
// ============================================================================

/**
 * Escape special characters in ZPL field data
 */
export function escapeZPL(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\^/g, '\\^')
    .replace(/~/g, '\\~')
    .replace(/\n/g, '\\&')
    .replace(/\r/g, '');
}

/**
 * Unescape ZPL special characters
 */
export function unescapeZPL(text: string): string {
  return text
    .replace(/\\\\/g, '\\')
    .replace(/\\\^/g, '^')
    .replace(/\\~/g, '~')
    .replace(/\\&/g, '\n');
}

/**
 * Calculate approximate print time in milliseconds
 * Based on label size and print speed
 */
export function estimatePrintTime(
  labelHeightMm: number,
  printSpeed: number = 2, // inches per second
  copies: number = 1
): number {
  const heightInches = labelHeightMm / 25.4;
  const timePerLabel = (heightInches / printSpeed) * 1000;
  return Math.ceil(timePerLabel * copies + 500); // Add 500ms buffer
}

// ============================================================================
// PRINTER UTILITIES
// ============================================================================

/**
 * Parse printer address
 * Supports: MAC address, IP:PORT, or just IP
 */
export function parsePrinterAddress(address: string): {
  type: 'bluetooth' | 'wifi' | 'usb';
  host: string;
  port?: number;
} {
  // MAC address pattern
  if (/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(address)) {
    return { type: 'bluetooth', host: address };
  }
  
  // IP:PORT pattern
  const ipPortMatch = address.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)$/);
  if (ipPortMatch) {
    return { type: 'wifi', host: ipPortMatch[1], port: parseInt(ipPortMatch[2], 10) };
  }
  
  // Just IP
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(address)) {
    return { type: 'wifi', host: address, port: 9100 };
  }
  
  // USB or unknown
  return { type: 'usb', host: address };
}

/**
 * Format printer address for display
 */
export function formatPrinterAddress(address: string, type: string): string {
  switch (type) {
    case 'bluetooth':
      return `BT: ${address}`;
    case 'wifi':
      return `WiFi: ${address}`;
    case 'usb':
      return `USB: ${address}`;
    default:
      return address;
  }
}

// All exports are already inline above
